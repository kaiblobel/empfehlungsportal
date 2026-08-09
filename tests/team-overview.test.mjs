import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (file) => readFile(path.join(root, file), 'utf8');

const [teamHtml, teamJs, navJs, supabaseJs, hubHtml, hubJs, css, sql, config, sw, beraterHtml] = await Promise.all([
  read('team.html'),
  read('js/team.js'),
  read('js/nav.js'),
  read('js/supabase.js'),
  read('hub.html'),
  read('js/hub.js'),
  read('css/hub.css'),
  read('schema-phase141.sql'),
  read('js/config.js'),
  read('sw.js'),
  read('berater.html'),
]);

assert.match(teamHtml, /<title>Teamübersicht · Empfehlungsportal<\/title>/);
assert.match(teamHtml, /data-days="7"/);
assert.match(teamHtml, /data-days="30"/);
assert.match(teamHtml, /data-days="90"/);
assert.match(teamHtml, /Teamranking/);
assert.match(teamHtml, /data-ranking="kunden"/);
assert.match(teamHtml, /data-ranking="empfehlungen"/);
assert.match(teamHtml, /data-ranking="promoter"/);
assert.match(teamHtml, /data-ranking="quote"/);
assert.match(teamHtml, /Alphabetisch · unabhängig vom Ranking/);
assert.match(teamHtml, /ohne Kundendaten offenzulegen/);
assert.match(teamHtml, /js\/team\.js\?v=2/);
assert.match(teamHtml, /css\/hub\.css\?v=53/);
assert.match(teamHtml, /js\/nav\.js\?v=59/);

assert.match(teamJs, /getTeamMetrics\(currentDays\)/);
assert.match(teamJs, /getTeamActivitySecure\(currentDays\)/);
assert.match(teamJs, /metrics\.reduce/);
assert.match(teamJs, /row\.berater_id === selectedId/);
assert.match(teamJs, /function renderRanking\(\)/);
assert.match(teamJs, /number\(row\.empfehlungen\) >= 3/);
assert.match(teamJs, /team-podium-place rank-/);
assert.doesNotMatch(teamJs, /empfaenger_name|empfaenger_telefon|empfehler_name/);

const teamPosition = navJs.indexOf("id: 'team'");
const dividerPosition = navJs.indexOf('{ divider: true');
const accountsPosition = navJs.indexOf("id: 'beraterkonten'");
assert.ok(teamPosition > 0 && teamPosition < dividerPosition, 'Team muss im Tagesgeschäft stehen');
assert.ok(accountsPosition > dividerPosition, 'Beraterkonten müssen unter Verwaltung stehen');
assert.match(navJs, /id: 'team',[\s\S]*?href: path\('team\.html'\)/);
assert.match(navJs, /id: 'beraterkonten',[\s\S]*?label: 'Beraterkonten'[\s\S]*?adminOnly: true/);
assert.doesNotMatch(navJs, /label: 'Team'[\s\S]{0,120}href: path\('berater\.html'\)/);

assert.match(supabaseJs, /export async function getTeamMetrics/);
assert.match(supabaseJs, /export async function getTeamActivitySecure/);
assert.match(supabaseJs, /\[7, 30, 90\]\.includes/);
assert.match(supabaseJs, /supabase\.rpc\('team_metrics'/);

assert.match(sql, /Status: LIVE ANGEWANDT AM 2026-08-05/);
assert.match(sql, /security definer/i);
assert.match(sql, /set search_path = ''/i);
assert.match(sql, /auth\.uid\(\)/);
assert.match(sql, /current_berater_id\(\)/);
assert.match(sql, /b\.ist_aktiv/);
assert.match(sql, /p_days not in \(7, 30, 90\)/);
assert.match(sql, /revoke execute on function public\.team_metrics\(integer\) from public, anon/i);
assert.match(sql, /grant execute on function public\.team_metrics\(integer\) to authenticated/i);
assert.match(sql, /create or replace function public\.team_activity_secure/);
assert.match(sql, /events\.berater_id/);
assert.match(sql, /revoke execute on function public\.team_activity_secure\(integer\) from public, anon/i);
assert.doesNotMatch(sql, /empfaenger_name|empfaenger_telefon|empfehler_email|empfehler_telefon/);

assert.match(hubHtml, /Teamübersicht öffnen/);
assert.match(hubHtml, /href="team\.html"/);
assert.match(hubJs, /rows\.slice\(0, 2\)\.map\(teamRowHtml\)/);
assert.doesNotMatch(hubJs, /teamFeedExpanded/);

assert.match(css, /\.team-kpi-strip/);
assert.match(css, /\.team-members/);
assert.match(css, /\.team-detail-grid/);
assert.match(css, /\.team-ranking/);
assert.match(css, /\.team-podium-avatar img/);
assert.match(css, /@media \(max-width: 560px\)[\s\S]*\.team-detail-metrics/);

assert.match(config, /v1\.196 Beta/);
assert.match(config, /Phase 170 · Kontakt-Coach/);
assert.match(sw, /CACHE_VERSION = 'v155-2026-08-09a'/);
assert.match(sw, /'\/team\.html'/);
assert.match(sw, /'\/js\/team\.js\?v=2'/);
assert.match(beraterHtml, /<title>Beraterkonten · Empfehlungsportal<\/title>/);

const htmlFiles = [];
async function collectHtml(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!['.git', 'node_modules'].includes(entry.name)) await collectHtml(full);
    } else if (entry.name.endsWith('.html')) htmlFiles.push(full);
  }
}
await collectHtml(root);
for (const file of htmlFiles) {
  const html = await readFile(file, 'utf8');
  assert.doesNotMatch(html, /js\/nav\.js\?v=5[34]/, `${path.relative(root, file)} enthält noch einen alten Navigationscache`);
  assert.doesNotMatch(html, /css\/hub\.css\?v=49/, `${path.relative(root, file)} enthält noch den alten Hub-CSS-Cache`);
}

console.log('team-overview: OK');
