// Supabase Edge Function: notify-interesse
// Wird vom Database-Trigger bei interessiert=true aufgerufen.
// Schickt eine Telegram-Nachricht an den konfigurierten Chat.
//
// Credentials werden aus der app_secrets-Tabelle gelesen (Service-Role-Key
// ist in Edge Functions automatisch via SUPABASE_SERVICE_ROLE_KEY verfügbar).

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DASHBOARD_BASE = Deno.env.get("DASHBOARD_BASE") ?? "https://empfehlungsportal.vercel.app";

Deno.serve(async (req: Request) => {
  try {
    const payload = await req.json();
    const { id, name, telefon } = payload ?? {};

    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: secretsRows, error: secretsErr } = await supa
      .from("app_secrets")
      .select("key, value");

    if (secretsErr) {
      console.error("Konnte app_secrets nicht laden:", secretsErr);
      return new Response(JSON.stringify({ ok: false, reason: "secrets-load-failed" }), { status: 200 });
    }

    const secrets = Object.fromEntries((secretsRows ?? []).map((r) => [r.key, r.value]));
    const TELEGRAM_BOT_TOKEN = secrets.TELEGRAM_BOT_TOKEN;
    const TELEGRAM_CHAT_ID = secrets.TELEGRAM_CHAT_ID;

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      console.warn("Telegram credentials nicht gesetzt — Notification übersprungen.");
      return new Response(JSON.stringify({ ok: false, reason: "no-credentials" }), { status: 200 });
    }

    const detailUrl = `${DASHBOARD_BASE}/dashboard/detail.html?id=${id}`;

    const text =
      `🔥 *Heißer Lead*\n\n` +
      `*${escapeMd(name ?? "Unbekannt")}*\n` +
      `📞 ${escapeMd(formatPhone(telefon))}\n\n` +
      `⏱ Soeben Interesse bekundet.\n` +
      `👉 [Im Dashboard öffnen](${detailUrl})`;

    const tgRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text,
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      }),
    });

    const tgJson = await tgRes.json();
    if (!tgRes.ok) {
      console.error("Telegram API error:", tgJson);
      return new Response(JSON.stringify({ ok: false, telegram: tgJson }), { status: 200 });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("notify-interesse error:", err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 200 });
  }
});

function formatPhone(raw?: string): string {
  if (!raw) return "–";
  const cleaned = raw.replace(/[^\d+]/g, "");
  if (cleaned.startsWith("49") || cleaned.startsWith("+49")) {
    const rest = cleaned.replace(/^\+?49/, "");
    return `+49 ${rest.replace(/(\d{3})(\d{3})(\d+)/, "$1 $2 $3")}`;
  }
  return cleaned;
}

function escapeMd(s: string): string {
  return s.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, "\\$1");
}
