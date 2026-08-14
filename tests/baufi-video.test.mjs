import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';

const html = readFileSync(new URL('../baufi.html', import.meta.url), 'utf8');
const videoPath = new URL('../assets/video/baufinanzierung-team-wachsbleiche-720p.mp4', import.meta.url);
const posterPath = new URL('../assets/video/baufinanzierung-team-wachsbleiche-poster.webp', import.meta.url);

const videoSection = html.indexOf('id="video"');
const compassSection = html.indexOf('id="compass"');

assert.ok(videoSection > 0, 'Videoabschnitt fehlt');
assert.ok(compassSection > videoSection, 'Video muss vor dem Finanzierungskompass stehen');
assert.match(html, /<video id="baufi-video" controls playsinline preload="metadata"/);
assert.match(html, /poster="\/assets\/video\/baufinanzierung-team-wachsbleiche-poster\.webp"/);
assert.match(html, /src="\/assets\/video\/baufinanzierung-team-wachsbleiche-720p\.mp4" type="video\/mp4"/);
assert.match(html, /class="primary-btn" type="button" data-scroll="compass">Danach Kompass starten<\/button>/);
assert.match(html, /baufi_video_started/);
assert.match(html, /baufi_video_completed/);
assert.match(html, /width:\s*min\(100%, 980px, 124vh\)/);
assert.match(html, /#baufi-video:fullscreen/);
assert.match(html, /object-fit:\s*contain/);

const videoSize = statSync(videoPath).size;
const posterSize = statSync(posterPath).size;
assert.ok(videoSize > 1_000_000, 'Videodatei ist unerwartet klein');
assert.ok(videoSize < 6_000_000, 'Webvideo ist größer als 6 MB');
assert.ok(posterSize > 10_000, 'Vorschaubild ist unerwartet klein');
assert.ok(posterSize < 200_000, 'Vorschaubild ist größer als 200 KB');

console.log('baufi-video: OK');
