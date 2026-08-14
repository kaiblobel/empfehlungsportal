// Supabase Edge Function: telegram-potenzial
// Empfängt eingehende Telegram-Updates des Portal-Bots (Webhook) und pflegt
// geteilte Kontakte, Textzeilen oder Sprachnachrichten als Einträge ins
// private Potenzialbuch. Sprachnachrichten werden per Groq-Whisper
// transkribiert und die Kontaktdaten per LLM herausgelöst.
// Absicherung: X-Telegram-Bot-Api-Secret-Token (app_secrets.TELEGRAM_WEBHOOK_SECRET)
// plus Chat-Whitelist (nur TELEGRAM_CHAT_ID). Fremde Chats werden still ignoriert.
// Der Berater ist über app_secrets.TELEGRAM_BERATER_ID fest zugeordnet.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PORTAL_URL = "https://empfehlungsportal.vercel.app/dashboard/potenziale.html";

const STATUS_LABEL: Record<string, string> = {
  offen: "offen",
  angesprochen: "angesprochen",
  im_gespraech: "im Gespräch",
  termin: "Termin",
  uebernommen: "ins Cockpit übernommen",
  kein_interesse: "kein Interesse",
};

Deno.serve(async (req: Request) => {
  const ok = (body: unknown = { ok: true }) =>
    new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } });

  try {
    if (req.method !== "POST") return ok({ ok: false, reason: "method" });

    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: secretsRows, error: secretsErr } = await supa
      .from("app_secrets")
      .select("key, value");
    if (secretsErr) {
      console.error("Konnte app_secrets nicht laden:", secretsErr);
      return ok({ ok: false, reason: "secrets-load-failed" });
    }
    const secrets = Object.fromEntries((secretsRows ?? []).map((r: any) => [r.key, r.value]));
    const BOT_TOKEN = secrets.TELEGRAM_BOT_TOKEN;
    const CHAT_ID = String(secrets.TELEGRAM_CHAT_ID ?? "");
    const WEBHOOK_SECRET = secrets.TELEGRAM_WEBHOOK_SECRET;
    const BERATER_ID = secrets.TELEGRAM_BERATER_ID;
    const GROQ_API_KEY = secrets.GROQ_API_KEY;
    if (!BOT_TOKEN || !CHAT_ID || !WEBHOOK_SECRET || !BERATER_ID) {
      console.warn("Telegram-Secrets unvollständig — Update ignoriert.");
      return ok({ ok: false, reason: "no-credentials" });
    }

    if (req.headers.get("x-telegram-bot-api-secret-token") !== WEBHOOK_SECRET) {
      return new Response("forbidden", { status: 403 });
    }

    const tg = async (method: string, payload: Record<string, unknown>) => {
      const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) console.error(`Telegram ${method} error:`, json);
      return json;
    };

    const update = await req.json();

    // ---- Selbsttest-Pfad (nur mit gültigem Webhook-Secret erreichbar) ----
    if (update?.selbsttest) {
      if (update.selbsttest === "extract" && typeof update.text === "string") {
        const ex = await groqExtract(GROQ_API_KEY, update.text);
        return ok({ ok: true, extract: ex });
      }
      if (update.selbsttest === "transcribe" && typeof update.audio_b64 === "string") {
        const bytes = Uint8Array.from(atob(update.audio_b64), (c) => c.charCodeAt(0));
        const t = await groqTranscribe(GROQ_API_KEY, bytes.buffer, "selbsttest.ogg");
        return ok({ ok: true, transkript: t });
      }
      return ok({ ok: false, reason: "selbsttest-unbekannt" });
    }

    // ---- Knopf-Antworten (Ziel wechseln / löschen) ----
    if (update.callback_query) {
      const cq = update.callback_query;
      const chatId = String(cq.message?.chat?.id ?? "");
      if (chatId !== CHAT_ID) return ok();

      const [action, id, wert] = String(cq.data ?? "").split("|");
      let toast = "";
      let newText: string | null = null;
      let newKeyboard: unknown = undefined;

      if (action === "z" && id && (wert === "kunde" || wert === "partner")) {
        const { data: row, error } = await supa
          .from("potenziale")
          .update({ ziel: wert })
          .eq("id", id)
          .eq("berater_id", BERATER_ID)
          .select("name, status")
          .maybeSingle();
        if (error || !row) {
          toast = "Eintrag nicht gefunden.";
        } else {
          toast = wert === "partner" ? "Ziel: Partner" : "Ziel: Kunde";
          newText = bestaetigungsText(row.name, wert, row.status);
          newKeyboard = keyboardFuer(id, wert);
        }
      } else if (action === "d" && id) {
        const { data: row, error } = await supa
          .from("potenziale")
          .delete()
          .eq("id", id)
          .eq("berater_id", BERATER_ID)
          .select("name")
          .maybeSingle();
        if (error || !row) {
          toast = "Eintrag nicht gefunden.";
        } else {
          toast = "Gelöscht.";
          newText = `🗑 ${row.name} wieder aus dem Potenzialbuch entfernt.`;
          newKeyboard = { inline_keyboard: [] };
        }
      } else {
        toast = "Unbekannte Aktion.";
      }

      await tg("answerCallbackQuery", { callback_query_id: cq.id, text: toast });
      if (newText && cq.message?.message_id) {
        await tg("editMessageText", {
          chat_id: chatId,
          message_id: cq.message.message_id,
          text: newText,
          reply_markup: newKeyboard,
          disable_web_page_preview: true,
        });
      }
      return ok();
    }

    // ---- Eingehende Nachrichten ----
    const msg = update.message;
    if (!msg) return ok();
    const chatId = String(msg.chat?.id ?? "");
    if (chatId !== CHAT_ID) return ok(); // fremder Chat: still ignorieren

    let name = "";
    let telefon: string | null = null;
    let email: string | null = null;
    let notiz: string | null = null;
    let zielWunsch: "kunde" | "partner" = "kunde";
    let transkript: string | null = null;

    if (msg.contact) {
      name = [msg.contact.first_name, msg.contact.last_name].filter(Boolean).join(" ").trim();
      telefon = msg.contact.phone_number ?? null;
      email = msg.contact.vcard?.match(/EMAIL[^:]*:([^\r\n]+)/i)?.[1]?.trim() ?? null;
    } else if (typeof msg.text === "string") {
      const text = msg.text.trim();
      if (text.startsWith("/")) {
        await tg("sendMessage", { chat_id: CHAT_ID, text: hilfeText(), disable_web_page_preview: true });
        return ok();
      }
      // Erst das Sprachmodell fragen, das versteht auch ganze Sätze wie
      // "Leg mir den Max an ...". Die einfache Zeilen-Zerlegung bleibt
      // Notlösung, falls Groq nicht erreichbar ist.
      let verstanden = false;
      if (GROQ_API_KEY) {
        const ex = await groqExtract(GROQ_API_KEY, text);
        if (ex && typeof ex.name === "string" && ex.name.trim().length >= 2) {
          name = ex.name.trim();
          telefon = typeof ex.telefon === "string" && ex.telefon.trim() ? ex.telefon.trim() : null;
          email = typeof ex.email === "string" && ex.email.trim() ? ex.email.trim() : null;
          notiz = typeof ex.notiz === "string" && ex.notiz.trim() ? ex.notiz.trim() : null;
          if (ex.ziel === "partner") zielWunsch = "partner";
          verstanden = true;
        } else if (ex) {
          await tg("sendMessage", {
            chat_id: CHAT_ID,
            text: "Da habe ich keinen Namen erkannt, es wurde nichts angelegt. " + hilfeText(),
            disable_web_page_preview: true,
          });
          return ok();
        }
      }
      if (!verstanden) {
        const parsed = parseZeile(text);
        name = parsed.name;
        telefon = parsed.telefon;
        email = parsed.email;
        notiz = parsed.notiz;
      }
    } else if (msg.voice) {
      if (!GROQ_API_KEY) {
        await tg("sendMessage", { chat_id: CHAT_ID, text: "Sprachnachrichten sind noch nicht eingerichtet (kein Groq-Schlüssel hinterlegt)." });
        return ok();
      }
      if ((msg.voice.duration ?? 0) > 300) {
        await tg("sendMessage", { chat_id: CHAT_ID, text: "Die Sprachnachricht ist zu lang, bitte höchstens 5 Minuten." });
        return ok();
      }
      const fileInfo = await tg("getFile", { file_id: msg.voice.file_id });
      const filePath = fileInfo?.result?.file_path;
      let audio: ArrayBuffer | null = null;
      if (filePath) {
        const res = await fetch(`https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`);
        if (res.ok) audio = await res.arrayBuffer();
      }
      if (!audio) {
        await tg("sendMessage", { chat_id: CHAT_ID, text: "❌ Die Sprachnachricht konnte ich nicht laden, versuch es bitte nochmal." });
        return ok();
      }
      transkript = await groqTranscribe(GROQ_API_KEY, audio, filePath ?? "voice.ogg");
      if (!transkript) {
        await tg("sendMessage", { chat_id: CHAT_ID, text: "❌ Ich konnte die Sprachnachricht nicht verstehen, versuch es bitte nochmal." });
        return ok();
      }
      const ex = await groqExtract(GROQ_API_KEY, transkript);
      if (!ex || typeof ex.name !== "string" || ex.name.trim().length < 2) {
        await tg("sendMessage", {
          chat_id: CHAT_ID,
          text:
            `Verstanden habe ich: „${transkript}“\n\n` +
            "Einen Namen konnte ich darin nicht erkennen. Sag mir Name und Nummer, " +
            "oder schreib eine Zeile wie: Max Mustermann 0171 2345678",
          disable_web_page_preview: true,
        });
        return ok();
      }
      name = ex.name.trim();
      telefon = typeof ex.telefon === "string" && ex.telefon.trim() ? ex.telefon.trim() : null;
      email = typeof ex.email === "string" && ex.email.trim() ? ex.email.trim() : null;
      notiz = typeof ex.notiz === "string" && ex.notiz.trim() ? ex.notiz.trim() : null;
      if (ex.ziel === "partner") zielWunsch = "partner";
    } else {
      return ok(); // Fotos, Sticker etc. ignorieren
    }

    if (name.length < 2) {
      await tg("sendMessage", {
        chat_id: CHAT_ID,
        text: "Da fehlt mir ein Name. " + hilfeText(),
        disable_web_page_preview: true,
      });
      return ok();
    }
    if (name.length > 160) name = name.slice(0, 160);
    if (telefon && telefon.length > 50) telefon = telefon.slice(0, 50);
    if (email && email.length > 254) email = null;
    if (notiz && notiz.length > 4000) notiz = notiz.slice(0, 4000);

    // Duplikat-Prüfung (gleiche Telefonnummer oder exakt gleicher Name)
    const { data: bestand } = await supa
      .from("potenziale")
      .select("id, name, telefon, status")
      .eq("berater_id", BERATER_ID)
      .limit(2000);
    const neuNorm = normTelefon(telefon);
    const dupe = (bestand ?? []).find((p: any) => {
      const alt = normTelefon(p.telefon);
      if (neuNorm && alt && neuNorm === alt) return true;
      return p.name?.trim().toLowerCase() === name.toLowerCase();
    });
    if (dupe) {
      await tg("sendMessage", {
        chat_id: CHAT_ID,
        text:
          `⚠️ ${dupe.name} steht schon im Potenzialbuch (Status: ${STATUS_LABEL[dupe.status] ?? dupe.status}). ` +
          `Ich habe nichts doppelt angelegt.\n\n${PORTAL_URL}`,
        disable_web_page_preview: true,
      });
      return ok();
    }

    const { data: row, error: insErr } = await supa
      .from("potenziale")
      .insert({ berater_id: BERATER_ID, name, telefon, email, notiz, ziel: zielWunsch, status: "offen" })
      .select("id, name, status")
      .single();
    if (insErr || !row) {
      console.error("Insert fehlgeschlagen:", insErr);
      await tg("sendMessage", {
        chat_id: CHAT_ID,
        text: "❌ Das hat nicht geklappt, der Eintrag wurde nicht angelegt. Versuch es bitte nochmal.",
      });
      return ok({ ok: false, reason: "insert-failed" });
    }

    await tg("sendMessage", {
      chat_id: CHAT_ID,
      text:
        bestaetigungsText(row.name, zielWunsch, row.status) +
        (telefon ? `\n📞 ${telefon}` : "") +
        (email ? `\n✉️ ${email}` : "") +
        (notiz ? `\n📝 ${notiz}` : "") +
        (transkript ? `\n\n🎙 Verstanden habe ich: „${transkript}“` : ""),
      reply_markup: keyboardFuer(row.id, zielWunsch),
      disable_web_page_preview: true,
    });
    return ok();
  } catch (err) {
    console.error("telegram-potenzial error:", err);
    // Immer 200, sonst wiederholt Telegram das Update endlos.
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      headers: { "Content-Type": "application/json" },
    });
  }
});

function bestaetigungsText(name: string, ziel: string, status: string): string {
  const zielLabel = ziel === "partner" ? "Partner" : "Kunde";
  return (
    `✅ ${name} steht im Potenzialbuch.\n` +
    `Ziel: ${zielLabel} · Status: ${STATUS_LABEL[status] ?? status}\n\n${PORTAL_URL}`
  );
}

function keyboardFuer(id: string, ziel: string) {
  const wechsel =
    ziel === "partner"
      ? { text: "Ziel auf Kunde ändern", callback_data: `z|${id}|kunde` }
      : { text: "Ziel auf Partner ändern", callback_data: `z|${id}|partner` };
  return { inline_keyboard: [[wechsel], [{ text: "🗑 Wieder löschen", callback_data: `d|${id}` }]] };
}

function hilfeText(): string {
  return (
    "So kommt ein Kontakt ins Potenzialbuch:\n\n" +
    "📇 Teile mir einen Kontakt aus deinem Adressbuch (Büroklammer → Kontakt).\n" +
    "✍️ Oder schreib eine Zeile wie: Max Mustermann 0171 2345678\n" +
    "🎙 Oder sprich mir eine Sprachnachricht ein, zum Beispiel: „Leg mir den Max Mustermann an, 0171 2345678, kenne ich vom Fußball.“\n" +
    "Alles ab der zweiten Zeile (oder Gesprochenes drumherum) speichere ich als Notiz.\n\n" +
    PORTAL_URL
  );
}

function parseZeile(text: string): { name: string; telefon: string | null; email: string | null; notiz: string | null } {
  const zeilen = text.split("\n").map((z) => z.trim()).filter(Boolean);
  let erste = zeilen[0] ?? "";
  let email: string | null = null;
  let telefon: string | null = null;

  const emailMatch = erste.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  if (emailMatch) {
    email = emailMatch[0];
    erste = erste.replace(emailMatch[0], " ");
  }
  const telMatch = erste.match(/\+?\d[\d\s\/\-().]{5,}\d/);
  if (telMatch) {
    telefon = telMatch[0].replace(/\s+/g, " ").trim();
    erste = erste.replace(telMatch[0], " ");
  }
  const name = erste.replace(/[,;|]+/g, " ").replace(/\s+/g, " ").trim();
  const notiz = zeilen.slice(1).join("\n") || null;
  return { name, telefon, email, notiz };
}

function normTelefon(raw?: string | null): string | null {
  const ziffern = (raw ?? "").replace(/\D/g, "");
  if (ziffern.length < 7) return null;
  return ziffern.slice(-9);
}

async function groqTranscribe(key: string | undefined, audio: ArrayBuffer, fileName: string): Promise<string | null> {
  if (!key) return null;
  const ext = (fileName.split(".").pop() ?? "ogg").toLowerCase();
  const fd = new FormData();
  fd.append("file", new Blob([audio]), `audio.${ext}`);
  fd.append("model", "whisper-large-v3");
  fd.append("language", "de");
  fd.append("temperature", "0");
  const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: fd,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    console.error("Groq transcribe error:", json);
    return null;
  }
  const text = String(json?.text ?? "").trim();
  return text || null;
}

async function groqExtract(key: string | undefined, transkript: string): Promise<any | null> {
  if (!key) return null;
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Du extrahierst Kontaktdaten aus der diktierten oder getippten Notiz eines Finanzberaters, der eine Person in sein Potenzialbuch aufnehmen will. " +
            "Wird keine konkrete Person mit Namen genannt, setze name auf null. " +
            'Antworte nur mit einem JSON-Objekt: {"name": string|null, "telefon": string|null, "email": string|null, "ziel": "kunde"|"partner", "notiz": string|null}. ' +
            "name: voller Name der genannten Person, ohne Befehls- und Füllworte, nie der Sprecher selbst. " +
            "telefon: Telefonnummer als Ziffernfolge, deutsche Zahlwörter in Ziffern umwandeln, sonst null. " +
            'ziel: "partner" nur wenn die Person ausdrücklich als (Team-)Partner oder Mitarbeiter gemeint ist, sonst "kunde". ' +
            "notiz: übrige nützliche Infos als knapper Klartext (Woher kennt man sich? Anlass? Wann melden?), sonst null.",
        },
        { role: "user", content: transkript },
      ],
    }),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    console.error("Groq extract error:", json);
    return null;
  }
  try {
    return JSON.parse(json?.choices?.[0]?.message?.content ?? "");
  } catch {
    return null;
  }
}
