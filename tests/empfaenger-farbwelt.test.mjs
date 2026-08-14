import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const html = read('empfaenger.html');
const colors = read('css/empfaenger-hell.css');

assert.match(html, /\/css\/empfaenger-hell\.css\?v=\d+/, 'Die helle Empfänger-Farbwelt ist nicht eingebunden');
assert.match(html, /name="theme-color" content="#ffffff"/, 'Der Browser-Rahmen ist nicht auf Weiß gestellt');
assert.match(colors, /--paper:\s*#ffffff/, 'Die Empfängerseite hat keine weiße Grundfläche');
assert.match(colors, /\.story::before\s*\{[\s\S]*background:\s*none/, 'Die cremefarbene Hintergrundwirkung ist noch aktiv');
assert.match(colors, /\.primary\s*\{[\s\S]*background:\s*var\(--blue-dark\)/, 'Die Hauptführung verwendet nicht das CI-Dunkelblau');
assert.match(colors, /data-interest="kosten"[\s\S]*--choice-color:\s*#c9a04a/, 'Die Gold-Orientierung fehlt');
assert.match(colors, /data-interest="foerderung"[\s\S]*--choice-color:\s*#f5d547/, 'Die gelbe Förder-Orientierung fehlt');
assert.match(colors, /data-interest="struktur"[\s\S]*--choice-color:\s*#3e8b8b/, 'Die türkise Struktur-Orientierung fehlt');
assert.match(colors, /@media \(max-width: 780px\)/, 'Mobile Anpassungen fehlen');

console.log('empfaenger-farbwelt: OK');
