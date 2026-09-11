#!/usr/bin/env node
/**
 * Kleiner Server, nur zum Ansehen der Vorschau.
 *
 *   node tools/vorschau-server.mjs [Port]
 *
 * Liefert die Dateien des Arbeitsordners aus, damit die Vorschau in docs/ die
 * echten Bilder, den Film und die Schriften aus assets/ laden kann. Hört auf
 * allen Netzwerkkarten, damit die Seite auch am Handy im eigenen Netz oder über
 * Tailscale erreichbar ist. Nur lesend, keine Datenbank, nichts wird gespeichert.
 *
 * tools/ steht in .vercelignore, diese Datei wird also nie veröffentlicht.
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { networkInterfaces } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const wurzel = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.argv[2]) || 8877;
const START = '/docs/vorschau-empfaenger-rahmen.html';

const TYPEN = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
  '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.mp4': 'video/mp4', '.m4v': 'video/mp4',
  '.txt': 'text/plain; charset=utf-8',
};

const server = createServer(async (req, res) => {
  // Nur lesen. Alles andere wird abgewiesen, damit hier nichts geschrieben wird.
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' }).end('Nur lesend.');
    return;
  }
  try {
    const url = new URL(req.url, 'http://x');
    let rel = decodeURIComponent(url.pathname);
    if (rel === '/' || rel === '') rel = START;
    const datei = path.resolve(wurzel, rel.replace(/^\/+/, ''));
    if (!datei.startsWith(wurzel)) { res.writeHead(403).end('Außerhalb des Ordners.'); return; }

    const info = await stat(datei);
    if (info.isDirectory()) { res.writeHead(404).end('Kein Verzeichnis.'); return; }

    const typ = TYPEN[path.extname(datei).toLowerCase()] || 'application/octet-stream';
    if (req.method === 'HEAD') {
      res.writeHead(200, { 'Content-Type': typ, 'Content-Length': info.size }).end();
      return;
    }
    const inhalt = await readFile(datei);
    res.writeHead(200, {
      'Content-Type': typ,
      'Content-Length': inhalt.length,
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    });
    res.end(inhalt);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Nicht gefunden.');
  }
});

server.listen(port, '0.0.0.0', () => {
  const adressen = [];
  for (const [name, liste] of Object.entries(networkInterfaces())) {
    for (const n of liste || []) {
      if (n.family === 'IPv4' && !n.internal) adressen.push({ name, adresse: n.address });
    }
  }
  console.log(`Vorschau läuft. Beenden mit Strg+C.\n`);
  console.log(`  Am Rechner:  http://127.0.0.1:${port}${START}`);
  for (const a of adressen) {
    const hinweis = a.adresse.startsWith('100.') ? '  (Tailscale, auch von unterwegs)' : '  (eigenes Netz)';
    console.log(`  Am Handy:    http://${a.adresse}:${port}${START}${hinweis}`);
  }
});
