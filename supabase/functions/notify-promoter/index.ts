import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.7";

const DASHBOARD_BASE = Deno.env.get("DASHBOARD_BASE") ??
  "https://empfehlungsportal.vercel.app";

const SOURCE_LABELS: Record<string, string> = {
  praesentation: "Präsentation",
  aufsteller: "Büro-Aufsteller",
  direkt: "Direkter Link",
  portal: "Portal",
};

Deno.serve(async (req: Request) => {
  try {
    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: secretRows, error: secretError } = await supa
      .from("app_secrets")
      .select("key, value");
    if (secretError) throw secretError;
    const secrets = Object.fromEntries(
      (secretRows ?? []).map((row: any) => [row.key, row.value]),
    );

    const providedToken = req.headers.get("x-internal-token");
    if (
      !secrets.INTERNAL_FUNCTION_TOKEN ||
      providedToken !== secrets.INTERNAL_FUNCTION_TOKEN
    ) {
      return Response.json({ ok: false, reason: "unauthorized" }, {
        status: 401,
      });
    }

    const { id } = await req.json();
    if (!id) {
      return Response.json({ ok: false, reason: "missing-id" }, {
        status: 400,
      });
    }

    const { data: promoter, error: promoterError } = await supa
      .from("empfehler")
      .select(
        "id, name, email, telefon, berater_id, self_registered_at, self_registration_source",
      )
      .eq("id", id)
      .maybeSingle();
    if (promoterError) throw promoterError;
    if (!promoter?.self_registered_at) {
      return Response.json({ ok: false, reason: "not-a-self-registration" }, {
        status: 404,
      });
    }

    const { data: berater } = await supa
      .from("berater")
      .select("name, auth_user_id")
      .eq("id", promoter.berater_id)
      .maybeSingle();

    const detailUrl = `${DASHBOARD_BASE}/dashboard/promoter.html?id=${
      encodeURIComponent(promoter.id)
    }`;
    const source = SOURCE_LABELS[promoter.self_registration_source] ??
      "Öffentliche Anmeldung";
    const contact = promoter.telefon || promoter.email || "Kontakt im Portal";

    let telegramOk = false;
    if (secrets.TELEGRAM_BOT_TOKEN && secrets.TELEGRAM_CHAT_ID) {
      let text = `✨ *Neuer Promoter*\n\n` +
        `*${escapeMd(promoter.name || "Unbekannt")}*\n` +
        `📬 ${escapeMd(contact)}\n` +
        `📍 Quelle: ${escapeMd(source)}`;
      if (berater?.name) text += `\n👤 Berater: ${escapeMd(berater.name)}`;
      text += `\n\n👉 [Promoter im Portal öffnen](${detailUrl})`;

      const response = await fetch(
        `https://api.telegram.org/bot${secrets.TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: secrets.TELEGRAM_CHAT_ID,
            text,
            parse_mode: "Markdown",
            disable_web_page_preview: true,
          }),
        },
      );
      telegramOk = response.ok;
      if (!response.ok) console.error("Telegram fail", await response.text());
    }

    let pushSent = 0;
    let pushFailed = 0;
    if (
      berater?.auth_user_id && secrets.VAPID_PUBLIC_KEY &&
      secrets.VAPID_PRIVATE_KEY
    ) {
      try {
        webpush.setVapidDetails(
          secrets.VAPID_SUBJECT ?? "mailto:hello@example.com",
          secrets.VAPID_PUBLIC_KEY,
          secrets.VAPID_PRIVATE_KEY,
        );
        const { data: subscriptions } = await supa
          .from("push_subscriptions")
          .select("id, endpoint, p256dh, auth")
          .eq("user_id", berater.auth_user_id);
        const pushPayload = JSON.stringify({
          title: "Neuer Promoter",
          body: `${
            promoter.name || "Ein neuer Promoter"
          } hat sich über ${source} registriert.`,
          url: detailUrl,
          tag: `promoter-${promoter.id}`,
        });
        for (const subscription of subscriptions ?? []) {
          try {
            await webpush.sendNotification(
              {
                endpoint: subscription.endpoint,
                keys: { p256dh: subscription.p256dh, auth: subscription.auth },
              },
              pushPayload,
            );
            pushSent++;
          } catch (error: any) {
            pushFailed++;
            if (error.statusCode === 404 || error.statusCode === 410) {
              await supa.from("push_subscriptions").delete().eq(
                "id",
                subscription.id,
              );
            } else {
              console.error("push fail", error.statusCode, error.body);
            }
          }
        }
      } catch (error) {
        console.error("webpush setup failed", error);
      }
    }

    return Response.json({
      ok: true,
      telegram: telegramOk,
      pushSent,
      pushFailed,
    });
  } catch (error) {
    console.error("notify-promoter error:", error);
    return Response.json({ ok: false, error: String(error) }, { status: 200 });
  }
});

function escapeMd(value: string): string {
  return String(value).replace(/([_*\[\]()~`>#+\-=|{}.!])/g, "\\$1");
}
