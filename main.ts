// Vice Cover Studio — the gta6-cover-art-01 entry program (Node 22, standard library only).
//
// The app itself is the static folder app/ beside this file: plain HTML, CSS and ES modules
// that a desktop browser loads offline (index.html, its modules under src/, the OFL Anton
// font under fonts/, and four original sample photos under samples/). No library, no
// network request, no build step.
//
// This program is only the hand-in: it copies app/ and screenshots/ into /output and
// writes /output/dossier.json — the summary the judge reads — using the vendored make.fun
// helper. The cover art the bounty asks for is the app: a multi-panel GTA-style cover
// maker (Poster / Grid / Strips layouts, sunset / neon / noir grades, comic halftone,
// bold Anton caption) that exports a PNG in 1080 x 1080, 1080 x 1350 or 1920 x 1080.
//
// Try it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the
// rest refuse an entry the scorer would refuse anyway (more than 4 screenshots, or one
// over 256 KiB; more than 993 files in app/ or 48 MiB of app files in all, or a path under
// app/ over 1000 bytes — app/ counts beside /output's own 1000-entry cap, its screenshots/
// and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
