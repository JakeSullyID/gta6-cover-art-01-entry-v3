// KEY ART — the dev server.
//
// Serves ./app over plain HTTP so the entry can be tried locally with
// no build step: `node serve.ts` listens on http://localhost:8080, and
// --port picks another. It answers with the MIME types an offline web
// app needs, refuses any path that escapes app/, and otherwise does
// nothing clever — a development convenience, not a server for the
// internet. The app itself is fully static and needs no server at all
// once opened from a file path.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP_DIR = join(fileURLToPath(new URL('.', import.meta.url)), 'app');

// Extension -> MIME type. Anything unlisted falls back to octet-stream.
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain',
};

function portFrom(argv) {
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--port') {
      const n = Number(argv[i + 1]);
      if (Number.isInteger(n) && n > 0 && n < 65536) return n;
      return 8080;
    }
  }
  return 8080;
}

const port = portFrom(process.argv.slice(2));

createServer(async (req, res) => {
  const raw = decodeURIComponent((req.url || '/').split(/[?#]/)[0]);
  const rel = raw === '/' ? 'index.html' : raw.replace(/^\/+/, '');
  const path = normalize(join(APP_DIR, rel));
  if (!path.startsWith(APP_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  let bytes;
  try {
    bytes = await readFile(path);
  } catch {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  res.writeHead(200, { 'Content-Type': MIME[extname(path).toLowerCase()] ?? 'application/octet-stream' });
  res.end(bytes);
}).listen(port, () => {
  console.log(`KEY ART dev server: http://localhost:${port}/`);
});
