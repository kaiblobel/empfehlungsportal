/** Öffentliche, auf das Nötigste begrenzte Beraterliste für KIDZ-Einladungen. */
const SUPABASE_URL = 'https://kkseqhmfubzfyloffkwe.supabase.co';
const ANON = 'sb_publishable_PUSXT6qIH0IoeEgKQ3hgbA_m8hYY4Dv';

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.statusCode = 405;
    return res.end(JSON.stringify({ ok: false }));
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/list_kidz_berater_public`, {
      method: 'POST',
      headers: {
        apikey: ANON,
        Authorization: `Bearer ${ANON}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
    });
    const advisors = await response.json().catch(() => []);
    if (!response.ok || !Array.isArray(advisors)) throw new Error(`Beraterliste: ${response.status}`);
    res.statusCode = 200;
    return res.end(JSON.stringify({ ok: true, advisors }));
  } catch (error) {
    console.error('[kidz-advisors]', error.message);
    res.statusCode = 502;
    return res.end(JSON.stringify({ ok: false, advisors: [] }));
  }
};
