import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DASHBOARD_BASE = Deno.env.get("DASHBOARD_BASE") ??
  "https://empfehlungsportal.vercel.app";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return Response.json({ ok: false }, { status: 405 });
  }

  try {
    const requestSecret = req.headers.get("x-promoter-secret") ?? "";
    if (!requestSecret) return Response.json({ ok: false }, { status: 401 });

    const {
      action,
      email,
      beraterSlug,
      rateKey,
      contactKey,
      tokenHash: consumeTokenHash,
    } = await req.json();
    const serverKey = getServerKey();
    if (!serverKey) return Response.json({ ok: false }, { status: 503 });
    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      serverKey,
    );

    if (action === "consume") {
      const { data, error } = await supa.rpc("consume_empfehler_access", {
        p_secret: requestSecret,
        p_token_hash: consumeTokenHash,
      });
      if (error) {
        const status =
          String(error.message || "").includes("authentication failed")
            ? 401
            : 502;
        return Response.json({ ok: false }, { status });
      }
      return Response.json(
        data?.ok && data?.code ? { ok: true, code: data.code } : { ok: false },
      );
    }

    if (action !== "request") {
      return Response.json({ ok: false }, { status: 400 });
    }

    const token = createToken();
    const tokenHash = await sha256(token);
    const { data: access, error: accessError } = await supa.rpc(
      "request_empfehler_access",
      {
        p_secret: requestSecret,
        p_email: email,
        p_berater_slug: beraterSlug,
        p_rate_key: rateKey,
        p_contact_key: contactKey,
        p_token_hash: tokenHash,
      },
    );

    if (accessError) {
      const message = String(accessError.message || "");
      if (message.includes("Zu viele Anfragen")) {
        return Response.json({ ok: false }, { status: 429 });
      }
      if (message.includes("authentication failed")) {
        return Response.json({ ok: false }, { status: 401 });
      }
      console.error("promoter-access request rpc failed");
      return Response.json({ ok: false }, { status: 502 });
    }

    if (!access?.found) return Response.json({ ok: true });

    const { data: secretRows, error: secretError } = await supa
      .from("app_secrets")
      .select("key, value");
    if (secretError) throw new Error("secret lookup failed");
    const secrets = Object.fromEntries(
      (secretRows ?? []).map((row: any) => [row.key, row.value]),
    );
    if (!secrets.RESEND_API_KEY) throw new Error("resend not configured");

    const adviserName = cleanText(access.berater_name) ||
      secrets.BERATER_NAME || "Dein Berater";
    const firstName = cleanText(access.name).split(/\s+/)[0] || "";
    const accessUrl = new URL("/promoter-access.html", new URL(DASHBOARD_BASE));
    accessUrl.hash = new URLSearchParams({
      token,
      berater: String(beraterSlug || ""),
    }).toString();
    const from = senderWith(
      adviserName,
      secrets.RESEND_FROM ??
        "Kai Blobel <noreply@empfehlungsportal.vercel.app>",
    );

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${secrets.RESEND_API_KEY}`,
        "Idempotency-Key": `promoter-access-${access.access_id}`,
      },
      body: JSON.stringify({
        from,
        to: access.email,
        subject: "Dein persönlicher Zugang zum Empfehlungsbereich",
        html: emailHtml(firstName, adviserName, accessUrl.toString()),
        text: emailText(firstName, adviserName, accessUrl.toString()),
      }),
    });

    if (!response.ok) {
      console.error("promoter-access resend failed", response.status);
      return Response.json({ ok: true });
    }

    await supa.rpc("mark_empfehler_access_sent", {
      p_access_id: access.access_id,
    });
    return Response.json({ ok: true });
  } catch (_) {
    console.error("promoter-access request failed");
    return Response.json({ ok: true });
  }
});

function getServerKey(): string {
  try {
    const current = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");
    if (current.default) return String(current.default);
  } catch (_) {
    // Fallback fuer Projekte, die noch die bisherigen JWT-Schluessel nutzen.
  }
  return Deno.env.get("SUPABASE_SECRET_KEY") ??
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
}

function createToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(
    /=+$/g,
    "",
  );
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function cleanText(value: unknown): string {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function senderWith(name: string, resendFrom: string): string {
  const address = resendFrom.match(/<([^>]+)>/)?.[1] ?? resendFrom.trim();
  const cleanName = String(name).replace(/["\\<>]/g, "").trim();
  if (!cleanName || !address) return resendFrom;
  return `${cleanName} <${address}>`;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char]!));
}

function emailHtml(
  firstName: string,
  adviserName: string,
  url: string,
): string {
  const greeting = firstName ? `Hallo ${escapeHtml(firstName)},` : "Hallo,";
  return `<!doctype html>
<html lang="de"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:32px 16px;background:#F7F4EE;color:#20231F;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:38px 32px;background:#FFFDF9;border:1px solid rgba(32,35,31,.13);border-radius:14px;">
    <p style="margin:0 0 16px;color:#8D7B4E;font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;">Empfehlungsportal</p>
    <h1 style="margin:0 0 18px;font-size:28px;line-height:1.15;">${greeting}</h1>
    <p style="margin:0 0 24px;color:#565850;font-size:15px;line-height:1.6;">Mit diesem Einmal-Link öffnest du deinen persönlichen Empfehlungsbereich. Der Link ist 15 Minuten gültig und kann nur einmal verwendet werden.</p>
    <a href="${
    escapeHtml(url)
  }" style="display:inline-block;padding:14px 22px;border-radius:9px;background:#20231F;color:#FFF;text-decoration:none;font-size:14px;font-weight:700;">Meinen Bereich öffnen</a>
    <p style="margin:28px 0 0;color:#696B64;font-size:12px;line-height:1.55;">Falls du den Link nicht angefordert hast, kannst du diese E-Mail einfach ignorieren.</p>
    <p style="margin:24px 0 0;color:#8D7B4E;font-size:13px;">${
    escapeHtml(adviserName)
  }</p>
  </div>
</body></html>`;
}

function emailText(
  firstName: string,
  adviserName: string,
  url: string,
): string {
  const greeting = firstName ? `Hallo ${firstName},` : "Hallo,";
  return `${greeting}\n\nMit diesem Einmal-Link öffnest du deinen persönlichen Empfehlungsbereich. Der Link ist 15 Minuten gültig und kann nur einmal verwendet werden.\n\n${url}\n\nFalls du den Link nicht angefordert hast, kannst du diese E-Mail einfach ignorieren.\n\n${adviserName}`;
}
