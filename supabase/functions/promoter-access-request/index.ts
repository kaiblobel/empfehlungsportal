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

// Outlook-tauglich gebaut (11.09.2026, Kais Wunsch "professioneller"): Outlook am
// Rechner ignoriert div-Abstände, runde Ecken und Polster an Links. Deshalb
// Tabellen, Inline-Stile, ein Knopf als Tabellenzelle mit bgcolor und das Logo
// als JPG (Outlook zeigt kein WebP). Das Logo liegt im Portal unter DASHBOARD_BASE.
function emailHtml(
  firstName: string,
  adviserName: string,
  url: string,
): string {
  const greeting = firstName ? `Hallo ${escapeHtml(firstName)},` : "Hallo,";
  const name = escapeHtml(adviserName);
  const link = escapeHtml(url);
  const logo = new URL(
    "/assets/images/team-wachsbleiche-marke-mail-120.jpg",
    new URL(DASHBOARD_BASE),
  ).toString();
  const font = "font-family:'Segoe UI',Helvetica,Arial,sans-serif;";
  return `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Dein persönlicher Zugang</title></head>
<body style="margin:0;padding:0;background:#F1F4F5;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Dein Einmal-Link ist 15 Minuten gültig.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F1F4F5" style="background:#F1F4F5;">
  <tr><td align="center" style="padding:32px 12px;">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" bgcolor="#FFFFFF" style="width:100%;max-width:560px;background:#FFFFFF;border:1px solid #E3E7E9;">
      <tr><td style="padding:28px 32px 20px 32px;border-bottom:3px solid #C8AA22;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
          <td width="48" style="padding-right:14px;"><img src="${logo}" width="48" height="48" alt="Team Wachsbleiche" style="display:block;width:48px;height:48px;border:0;border-radius:24px;"></td>
          <td style="${font}color:#13191D;font-size:15px;line-height:20px;"><strong>${name} &amp; Team</strong><br><span style="color:#5E6B70;font-size:13px;">Deutsche Vermögensberatung</span></td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:30px 32px 8px 32px;${font}color:#13191D;">
        <p style="margin:0 0 6px 0;color:#0B4650;font-size:12px;line-height:16px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Dein Empfehlungsbereich</p>
        <p style="margin:0 0 18px 0;font-size:24px;line-height:30px;font-weight:700;">${greeting}</p>
        <p style="margin:0 0 24px 0;color:#3D4A50;font-size:15px;line-height:24px;">hier ist dein Einmal-Link für deinen persönlichen Empfehlungsbereich. Er ist 15 Minuten gültig und funktioniert genau einmal.</p>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
          <td bgcolor="#0B4650" style="background:#0B4650;border-radius:10px;padding:14px 26px;">
            <a href="${link}" style="${font}color:#FFFFFF;font-size:15px;line-height:20px;font-weight:700;text-decoration:none;display:inline-block;">Meinen Bereich öffnen</a>
          </td>
        </tr></table>
        <p style="margin:26px 0 6px 0;color:#5E6B70;font-size:13px;line-height:20px;">Falls der Knopf nicht funktioniert, kopiere diesen Link in deinen Browser:</p>
        <p style="margin:0 0 24px 0;font-size:12px;line-height:18px;word-break:break-all;"><a href="${link}" style="color:#0B4650;text-decoration:underline;">${link}</a></p>
        <p style="margin:0 0 26px 0;color:#5E6B70;font-size:13px;line-height:20px;">Du hast den Link nicht angefordert? Dann kannst du diese Mail einfach ignorieren. Dein Bereich bleibt geschützt.</p>
        <p style="margin:0 0 30px 0;color:#13191D;font-size:15px;line-height:22px;">Viele Grüße<br><strong>${name}</strong></p>
      </td></tr>
      <tr><td style="padding:16px 32px 20px 32px;background:#F7F9F9;border-top:1px solid #E3E7E9;${font}color:#7A868B;font-size:11px;line-height:17px;">
        Diese Mail wurde automatisch versendet, weil mit dieser Adresse ein Zugang zum Empfehlungsbereich angefordert wurde.
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

function emailText(
  firstName: string,
  adviserName: string,
  url: string,
): string {
  const greeting = firstName ? `Hallo ${firstName},` : "Hallo,";
  return `${greeting}\n\nhier ist dein Einmal-Link für deinen persönlichen Empfehlungsbereich. Er ist 15 Minuten gültig und funktioniert genau einmal.\n\n${url}\n\nDu hast den Link nicht angefordert? Dann kannst du diese Mail einfach ignorieren. Dein Bereich bleibt geschützt.\n\nViele Grüße\n${adviserName}\n${adviserName} & Team · Deutsche Vermögensberatung`;
}
