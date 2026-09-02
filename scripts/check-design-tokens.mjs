#!/usr/bin/env node
/**
 * Fails the build if a literal palette colour is reintroduced into JSX.
 *
 * Why this exists: LensLeague had ~1,500 hand-typed colours (bg-white,
 * text-zinc-950, bg-[#17181a]) scattered across 24 files, plus a five-rule
 * override layer in globals.css trying to repaint some of them for dark mode.
 * The override could never cover every case, so pages rendered inconsistently -
 * that is why the login card and its Log In button disagreed with each other.
 *
 * The fix was to route every colour through the semantic tokens in
 * index.css / tailwind.config.js. This check keeps it that way.
 *
 * Use instead:  bg-background bg-card bg-muted bg-primary bg-brand
 *               text-foreground text-muted-foreground text-primary-foreground
 *               border-border border-ring
 */
import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const BANNED = [
  // solid light surfaces and text - always wrong on a dark ground
  /(?<![\w-])(?:[\w-]+:)*(?:bg|text|border|ring)-white(?![\w/-])/,
  /(?<![\w-])(?:[\w-]+:)*(?:bg|text|border|ring)-zinc-(?:50|100|200|300|950)(?![\w/-])/,
  /(?<![\w-])(?:[\w-]+:)*(?:bg|text|border|ring)-(?:gray|slate|neutral)-\d{2,3}(?![\w/-])/,
  // hardcoded hex
  /(?<![\w-])(?:bg|text|border|from|to|via)-\[#[0-9a-fA-F]{3,8}\]/,
];
// Fractional whites/blacks are legitimate overlays on photography (scrims,
// hairlines over images) and are deliberately allowed: bg-white/[.07], bg-black/40.

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    if (e === 'node_modules' || e === 'dist' || e.startsWith('.')) continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.jsx')) out.push(p);
  }
  return out;
}

const offences = [];
for (const file of walk('src')) {
  readFileSync(file, 'utf8').split(/\r?\n/).forEach((line, i) => {
    for (const re of BANNED) {
      const m = line.match(re);
      if (m) offences.push(`${file}:${i + 1}  ${m[0]}`);
    }
  });
}

if (offences.length) {
  console.error(`\n  ${offences.length} literal colour(s) found. Use a design token instead:\n`);
  offences.slice(0, 40).forEach(o => console.error('   ' + o));
  if (offences.length > 40) console.error(`   ...and ${offences.length - 40} more`);
  console.error('\n  Tokens live in src/index.css and tailwind.config.js.\n');
  process.exit(1);
}
console.log('design tokens: no literal colours in JSX');
