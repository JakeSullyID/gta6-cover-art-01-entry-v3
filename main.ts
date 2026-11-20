// KEY ART — the entrypoint (Node 22, standard library only).
//
// The poster app lives in app/ as plain static files: it opens in a
// desktop browser with no network at all and turns a person's photos
// into a GTA-style key art poster. This file is the thin bridge between
// that app and the grader. It walks app/ and screenshots/ into the
// output directory by hand, then asks the vendored make.fun library to
// describe exactly what landed there in dossier.json, so the judge
// reads a summary of the files it will actually be shown.
//
// Try it by hand with `node serve.ts` and http://localhost:8080.
// The grader invokes this file with no arguments and hands it the
// output directory through MAKEFUN_OUTPUT_DIR; a local run stands in
// for that with: mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoDir = fileURLToPath(new URL('.', import.meta.url));

// The grader sets MAKEFUN_OUTPUT_DIR; a local run without it lands in
// /output. Nothing about the output ever comes from argv — the grader
// passes no arguments at all.
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function copyInto(srcDir, destDir) {
  if (!existsSync(srcDir)) {
    throw new Error(`missing ${srcDir} — app/ and screenshots/ must sit beside main.ts`);
  }
  mkdirSync(destDir, { recursive: true });
  for (const name of readdirSync(srcDir)) {
    const from = join(srcDir, name);
    const to = join(destDir, name);
    if (statSync(from).isDirectory()) {
      copyInto(from, to);
    } else {
      writeFileSync(to, readFileSync(from));
    }
  }
}

for (const name of ['app', 'screenshots']) {
  copyInto(join(repoDir, name), join(outDir, name));
}

// The dossier is built only after the copies, so it measures the files
// the judge will actually see. The caps are the scorer's own: at most
// four screenshots and none over 256 KiB, the app tree capped at 993
// files and 48 MiB, and no single app path over 1000 bytes. Only
// text_max_bytes changes what the dossier itself holds — the other caps
// simply refuse an entry that is too big.
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
