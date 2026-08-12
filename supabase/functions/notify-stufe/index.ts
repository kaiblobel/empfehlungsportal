import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DASHBOARD_BASE = Deno.env.get("DASHBOARD_BASE") ?? "https://empfehlungsportal.vercel.app";

Deno.serve(async (req: Request) => {
  try {
    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: secretsRows } = await supa.from("app_secrets").select("key, value");
    const secrets = Object.fromEntries((secretsRows ?? []).map((r: any) => [r.key, r.value]));

    // Phase 28 · X-Internal-Token check
    const provided = req.headers.get("x-internal-token");
    const expected = secrets.INTERNAL_FUNCTION_TOKEN;
    if (!expected || provided !== expected) {
      return new Response(JSON.stringify({ ok: false, reason: "unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { empfehler_id, stufe } = await req.json();
    if (!empfehler_id || !stufe) {
      return new Response(JSON.stringify({ ok: false, reason: "missing-params" }), { status: 200 });
    }

    const { data: empfehler } = await supa
      .from("empfehler")
      .select("id, name, email, code, berater_id")
      .eq("id", empfehler_id)
      .maybeSingle();

    if (!empfehler) {
      return new Response(JSON.stringify({ ok: false, reason: "empfehler-not-found" }), { status: 200 });
    }

    // Phase 192 · Die Mail kommt vom ZUSTÄNDIGEN Berater, nicht pauschal von Kai.
    // Ein Promoter von Sven bekam bisher eine Glückwunsch-Mail, die mit
    // "— Kai Blobel" unterschrieben war.
    let beraterName: string | null = null;
    if (empfehler.berater_id) {
      const { data: b } = await supa
        .from("berater")
        .select("name")
        .eq("id", empfehler.berater_id)
        .maybeSingle();
      beraterName = b?.name ?? null;
    }

    // Phase 192 · Dieselbe Auflösung wie private.belohnungs_stufen_fuer():
    // eigene Stufen des Beraters, sonst das geteilte Admin-Set (Phase 57).
    // Ohne den berater_id-Bezug wurde bei mehreren Stufensätzen mit gleicher
    // Nummer eine beliebige genommen — bzw. maybeSingle() lief auf einen Fehler.
    const stufeDef = await ladeStufe(supa, empfehler.berater_id, stufe);
    if (!stufeDef) {
      return new Response(JSON.stringify({ ok: false, reason: "stufe-not-found" }), { status: 200 });
    }

    const RESEND_API_KEY = secrets.RESEND_API_KEY;
    const RESEND_FROM = secrets.RESEND_FROM ?? "Kai Blobel <noreply@empfehlungsportal.vercel.app>";
    const BERATER_NAME = beraterName ?? secrets.BERATER_NAME ?? "Kai Blobel";

    if (!RESEND_API_KEY) {
      console.warn("RESEND_API_KEY nicht gesetzt — Email übersprungen.");
      return new Response(JSON.stringify({ ok: false, reason: "no-resend-key" }), { status: 200 });
    }

    if (!empfehler.email) {
      return new Response(JSON.stringify({ ok: false, reason: "no-email" }), { status: 200 });
    }

    const firstName = (empfehler.name ?? "").split(" ")[0] || "";
    const empfehlerUrl = `${DASHBOARD_BASE}/empfehler.html?code=${empfehler.code ?? ""}`;

    const subject = stufeDef.icon
      ? `${stufeDef.icon} Stufe ${stufe} erreicht: ${stufeDef.titel}`
      : `Stufe ${stufe} erreicht: ${stufeDef.titel}`;

    const html = `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#FAF8F5;color:#1A1A1A;margin:0;padding:32px 16px;">
  <div style="max-width:520px;margin:0 auto;background:#FFFCF7;border:1px solid rgba(28,28,30,0.1);border-radius:4px;padding:40px 32px;">
    <div style="font-size:11px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:#C9B98A;margin-bottom:18px;">Empfehlungsprogramm</div>
    <h1 style="font-family:Georgia,serif;font-weight:300;font-size:32px;line-height:1.1;color:#0A0A0B;margin:0 0 14px;">${firstName ? `Glückwunsch, ${escapeHtml(firstName)}.` : "Glückwunsch."}</h1>
    <p style="font-family:Georgia,serif;font-style:italic;font-size:18px;color:#6E6660;margin:0 0 28px;">Du hast <strong style="font-style:normal;color:#0A0A0B;">Stufe ${stufe}</strong> erreicht: <strong style="font-style:normal;color:#0A0A0B;">${escapeHtml(stufeDef.titel)}</strong>.</p>
    <p style="font-size:15px;line-height:1.65;color:#1C1C1E;margin:0 0 16px;">${escapeHtml(stufeDef.beschreibung)}</p>
    ${stufeDef.wert_label ? `<p style="font-family:Georgia,serif;font-style:italic;color:#B8A570;font-size:14px;margin:0 0 28px;">Wert: ${escapeHtml(stufeDef.wert_label)}</p>` : ""}
    <div style="width:48px;height:1px;background:#C9B98A;margin:32px 0;"></div>
    <a href="${empfehlerUrl}" style="display:inline-block;background:#0A0A0B;color:#FAF8F5;text-decoration:none;font-weight:600;font-size:14px;padding:14px 24px;border-radius:4px;">Dein Dashboard öffnen</a>
    <p style="font-family:Georgia,serif;font-style:italic;color:#C9B98A;font-size:13px;margin:36px 0 0;">— ${escapeHtml(BERATER_NAME)}</p>
  </div>
</body></html>`;

    const text = `Glückwunsch${firstName ? ", " + firstName : ""}!\n\nDu hast Stufe ${stufe} erreicht: ${stufeDef.titel}.\n\n${stufeDef.beschreibung}${stufeDef.wert_label ? `\n\nWert: ${stufeDef.wert_label}` : ""}\n\nDein Dashboard: ${empfehlerUrl}\n\n— ${BERATER_NAME}`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: empfehler.email,
        subject,
        html,
        text,
      }),
    });

    const body = await res.json();
    if (!res.ok) {
      console.error("Resend fail", res.status, body);
      return new Response(JSON.stringify({ ok: false, resend: body }), { status: 200 });
    }

    return new Response(JSON.stringify({ ok: true, resend_id: body.id, berater: BERATER_NAME }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("notify-stufe error:", err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 200 });
  }
});

/** Eigene Stufe des Beraters, sonst die des Admins (geteiltes Set, Phase 57). */
async function ladeStufe(supa: any, beraterId: string | null, stufe: number) {
  if (beraterId) {
    const { data: eigene } = await supa
      .from("belohnungs_stufen")
      .select("stufe, titel, beschreibung, wert_label, icon")
      .eq("berater_id", beraterId)
      .eq("stufe", stufe)
      .maybeSingle();
    if (eigene) return eigene;

    // Hat der Berater überhaupt eigene Stufen? Wenn ja, ist das Fehlen dieser
    // einen Stufe eine bewusste Lücke — dann keine fremde Stufe unterschieben.
    const { count } = await supa
      .from("belohnungs_stufen")
      .select("stufe", { count: "exact", head: true })
      .eq("berater_id", beraterId);
    if ((count ?? 0) > 0) return null;
  }

  const { data: admin } = await supa
    .from("berater")
    .select("id")
    .eq("ist_admin", true)
    .order("name")
    .limit(1)
    .maybeSingle();
  if (!admin?.id) return null;

  const { data: geteilt } = await supa
    .from("belohnungs_stufen")
    .select("stufe, titel, beschreibung, wert_label, icon")
    .eq("berater_id", admin.id)
    .eq("stufe", stufe)
    .maybeSingle();
  return geteilt ?? null;
}

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[m]!));
}
