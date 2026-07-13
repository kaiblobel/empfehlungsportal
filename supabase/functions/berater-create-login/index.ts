// Phase 80 · berater-create-login
// Legt für einen Berater OHNE Login-Konto ein neues Auth-Konto MIT Passwort an
// (offizielle Admin-API, sofort login-fähig). Ersetzt den unzuverlässigen Magic-Link.
// Admin-abgesichert: nur ein eingeloggter Berater mit ist_admin=true darf aufrufen.
// Bestehende Konten werden NICHT angefasst (dafür der SQL-RPC admin_set_berater_password).

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Nicht eingeloggt.' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: 'Auth-Token ungültig.' }, 401);

    const admin = createClient(supabaseUrl, serviceKey);

    // Admin-Check: Aufrufer muss ein Berater mit ist_admin=true sein.
    const { data: caller } = await admin
      .from('berater')
      .select('ist_admin')
      .eq('auth_user_id', user.id)
      .maybeSingle();
    if (!caller?.ist_admin) return json({ error: 'Kein Admin-Zugriff.' }, 403);

    const body = await req.json().catch(() => ({}));
    const { berater_id, password } = body as { berater_id?: string; password?: string };
    if (!berater_id) return json({ error: 'berater_id fehlt.' }, 400);
    if (!password || password.length < 8) return json({ error: 'Passwort muss mindestens 8 Zeichen haben.' }, 400);

    const { data: berater, error: berErr } = await admin
      .from('berater')
      .select('id, name, email, auth_user_id')
      .eq('id', berater_id)
      .single();
    if (berErr) return json({ error: berErr.message }, 500);
    if (!berater) return json({ error: 'Berater nicht gefunden.' }, 404);
    if (berater.auth_user_id) return json({ error: 'Berater hat bereits ein Login.' }, 409);
    if (!berater.email) return json({ error: 'Berater hat keine E-Mail-Adresse hinterlegt.' }, 400);

    // Konto mit Passwort anlegen (E-Mail sofort bestätigt → direkt login-fähig).
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: berater.email,
      password,
      email_confirm: true,
    });
    if (createErr) return json({ error: createErr.message }, 500);

    // Verknüpfung sicherstellen (Trigger on_auth_user_created_link_berater macht das per
    // E-Mail-Match; wir setzen es zusätzlich explizit, falls der Trigger nicht griff).
    const newUserId = created?.user?.id;
    if (newUserId) {
      await admin.from('berater').update({ auth_user_id: newUserId }).eq('id', berater_id).is('auth_user_id', null);
    }

    return json({ ok: true, created: true, name: berater.name, email: berater.email });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}
