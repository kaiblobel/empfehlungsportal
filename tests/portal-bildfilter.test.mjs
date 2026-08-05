import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const sourceExtensions = new Set(['.html', '.css', '.js', '.svg']);
const ignoredDirectories = new Set(['.git', '.claude', 'node_modules', 'tests']);
const forbidden = [
  /grayscale\s*\(/i,
  /greyscale\s*\(/i,
  /saturate\s*\(\s*0\s*%?\s*\)/i,
  /<feColorMatrix\b[^>]*\btype=["']saturate["'][^>]*\bvalues=["']0(?:\.0+)?["']/i,
];

function collectSourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) {
      return ignoredDirectories.has(entry.name) ? [] : collectSourceFiles(join(directory, entry.name));
    }
    return sourceExtensions.has(extname(entry.name).toLowerCase()) ? [join(directory, entry.name)] : [];
  });
}

const findings = collectSourceFiles(root).flatMap((file) => {
  const source = readFileSync(file, 'utf8');
  return forbidden.some((pattern) => pattern.test(source)) ? [relative(root, file)] : [];
});

assert.deepEqual(findings, [], `Schwarz-Weiß- oder Entsättigungsfilter gefunden: ${findings.join(', ')}`);

console.log('portal-bildfilter: OK');
