import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.7";

const DASHBOARD_BASE = Deno.env.get("DASHBOARD_BASE") ?? "https://empfehlungsportal.vercel.app";

const ERR_LABELS: Record<string,string> = {
  vormittag: "Vormittag (8–12)", mittag: "Mittag (12–14)", nachmittag: "Nachmittag (14–18)",
  abend: "Abend (18–21)", we: "Wochenende", egal: "Egal",
};
const KANAL_LABELS: Record<string,string> = {
  anruf: "Anruf", whatsapp: "WhatsApp", sms: "SMS", email: "Email", egal: "Egal",
};

Deno.serve(async (req: Request) => {
  try {
    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: secretsRows } = await supa.from("app_secrets").select("key, value");
    const secrets = Object.fromEntries((secretsRows ?? []).map((r: any) => [r.key, r.value]));

    // Phase 28 · X-Internal-Token check (Shared-Secret aus app_secrets)
    const provided = req.headers.get("x-internal-token");
    const expected = secrets.INTERNAL_FUNCTION_TOKEN;
    if (!expected || provided !== expected) {
      return new Response(JSON.stringify({ ok: false, reason: "unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const payload = await req.json();
    const { id, name, telefon } = payload ?? {};

    const TELEGRAM_BOT_TOKEN = secrets.TELEGRAM_BOT_TOKEN;
    const TELEGRAM_CHAT_ID = secrets.TELEGRAM_CHAT_ID;
    const VAPID_PUBLIC_KEY = secrets.VAPID_PUBLIC_KEY;
    const VAPID_PRIVATE_KEY = secrets.VAPID_PRIVATE_KEY;
    const VAPID_SUBJECT = secrets.VAPID_SUBJECT ?? "mailto:hello@example.com";

    let emp: any = null;
    if (id) {
      const { data } = await supa
        .from("empfehlungen")
        .select("berater_id, anrufwunsch, empfehler_name, empfehler_id, empfaenger_beruf, empfaenger_verbindung, empfaenger_kontext, empfehler_vorinformiert, beste_erreichbarkeit, bevorzugter_kanal")
        .eq("id", id)
        .maybeSingle();
      emp = data;
    }

    // Phase 192 · Der Lead gehört genau einem Berater. Ohne diese Zuordnung
    // ging die Web-Push-Nachricht bisher an ALLE angemeldeten Geräte im
    // Portal — samt Name, Beruf, Anrufwunsch und Empfehler des fremden Leads.
    let berater: { name: string | null; auth_user_id: string | null } | null = null;
    if (emp?.berater_id) {
      const { data } = await supa
        .from("berater")
        .select("name, auth_user_id")
        .eq("id", emp.berater_id)
        .maybeSingle();
      berater = data;
    }

    let empfehlerScore: { gesamt: number; kunden: number } | null = null;
    if (emp?.empfehler_id) {
      const { data } = await supa.rpc("empfehler_score", { p_empfehler_id: emp.empfehler_id });
      const row = data?.[0];
      if (row && row.gesamt > 0) empfehlerScore = { gesamt: row.gesamt, kunden: row.kunden };
    }
    const stars = empfehlerScore ? starsFor(empfehlerScore) : "";

    const detailUrl = `${DASHBOARD_BASE}/dashboard/detail.html?id=${id}`;

    const anrufwunsch = emp?.anrufwunsch ?? null;
    const empfehlerName = emp?.empfehler_name ?? null;
    const beruf = emp?.empfaenger_beruf ?? null;
    const verbindung = emp?.empfaenger_verbindung ?? null;
    const kontext = emp?.empfaenger_kontext ?? null;
    const vorinformiert = !!emp?.empfehler_vorinformiert;
    const erreichbarkeit = emp?.beste_erreichbarkeit ? (ERR_LABELS[emp.beste_erreichbarkeit] ?? emp.beste_erreichbarkeit) : null;
    const kanal = emp?.bevorzugter_kanal ? (KANAL_LABELS[emp.bevorzugter_kanal] ?? emp.bevorzugter_kanal) : null;

    let telegramOk = false;
    if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
      let text =
        `🔥 *Heißer Lead*\n\n` +
        `*${escapeMd(name ?? "Unbekannt")}*\n` +
        `📞 ${escapeMd(formatPhone(telefon))}`;
      if (beruf) text += `\n💼 ${escapeMd(beruf)}`;
      if (anrufwunsch) text += `\n⏰ Anrufwunsch: ${escapeMd(anrufwunsch)}`;
      if (erreichbarkeit) text += `\n📅 Erreichbar: ${escapeMd(erreichbarkeit)}`;
      if (kanal) text += `\n💬 Kanal: ${escapeMd(kanal)}`;
      if (vorinformiert) text += `\n✅ Empfehler hat vorinformiert`;
      // Der Telegram-Kanal ist EIN Sammelkanal für alle Berater. Ohne diese
      // Zeile stand nirgends, um wessen Lead es geht.
      if (berater?.name) text += `\n👤 Berater: ${escapeMd(berater.name)}`;
      if (empfehlerName) {
        const scoreStr = empfehlerScore && empfehlerScore.gesamt > 1
          ? ` _(${stars} ${empfehlerScore.gesamt} Empf., ${empfehlerScore.kunden} Kunden)_`
          : "";
        text += `\n👥 Empfohlen von: ${escapeMd(empfehlerName)}${verbindung ? ` _(${escapeMd(verbindung)})_` : ""}${scoreStr}`;
      }
      if (kontext) text += `\n\n📝 _${escapeMd(kontext)}_`;
      text += `\n\n👉 [Im Dashboard öffnen](${detailUrl})`;

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
      telegramOk = tgRes.ok;
      if (!tgRes.ok) console.error("Telegram fail", await tgRes.text());
    }

    let pushSent = 0;
    let pushFailed = 0;
    let pushSkipped: string | null = null;
    if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
      if (!berater?.auth_user_id) {
        // Fail-closed: lieber keine Push-Nachricht als eine an alle.
        pushSkipped = "kein-zustaendiger-berater";
        console.warn("notify-interesse: kein auth_user_id zur Empfehlung", id);
      } else {
        try {
          webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
          const { data: subs } = await supa
            .from("push_subscriptions")
            .select("id, endpoint, p256dh, auth")
            .eq("user_id", berater.auth_user_id);
          const titlePrefix = anrufwunsch ? `Anrufwunsch: ${name ?? "Empfehlung"}` : `Interesse: ${name ?? "Empfehlung"}`;
          const bodyParts: string[] = [];
          if (anrufwunsch) bodyParts.push(`Zeitfenster: ${anrufwunsch}`);
          if (beruf) bodyParts.push(beruf);
          if (vorinformiert) bodyParts.push("vorinformiert");
          if (empfehlerName) bodyParts.push(`empfohlen von ${empfehlerName}${verbindung ? ` (${verbindung})` : ""}${stars ? ` ${stars}` : ""}`);
          const pushPayload = JSON.stringify({
            title: titlePrefix,
            body: bodyParts.join(" · ") || "Im Dashboard öffnen",
            url: detailUrl,
            tag: `lead-${id}`,
          });
          for (const s of (subs ?? [])) {
            try {
              await webpush.sendNotification(
                { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
                pushPayload,
              );
              pushSent++;
            } catch (err: any) {
              pushFailed++;
              if (err.statusCode === 404 || err.statusCode === 410) {
                await supa.from("push_subscriptions").delete().eq("id", s.id);
              } else {
                console.error("push fail", err.statusCode, err.body);
              }
            }
          }
        } catch (err) {
          console.error("webpush setup failed", err);
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, telegram: telegramOk, pushSent, pushFailed, pushSkipped }), {
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

function starsFor(s: { gesamt: number; kunden: number }): string {
  if (s.kunden >= 3 || (s.gesamt >= 5 && s.kunden >= 2)) return "★★★★";
  if (s.kunden >= 1 && s.gesamt >= 3) return "★★★";
  if (s.kunden >= 1 || s.gesamt >= 2) return "★★";
  return "★";
}

function escapeMd(s: string): string {
  return s.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, "\\$1");
}
