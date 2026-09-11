/**
 * Is this SQL file ONE statement?
 *
 * The Supabase SQL editor displays only the LAST statement's result. A check
 * script written as several SELECTs silently reports its final line and hides
 * everything before it - which is how a migration gets called verified when
 * most of it never ran.
 *
 * Counting semicolons naively is wrong twice over: they appear inside `--`
 * comments and inside string literals, and both times they mean nothing. This
 * strips comments and quoted strings first, then counts what is left.
 *
 * Usage: node scripts/check-sql-single-statement.mjs supabase/CHECK_*.sql
 */
import { readFileSync } from 'node:fs';

function executableSemicolons(sql) {
  let out = '';
  let i = 0;
  while (i < sql.length) {
    const two = sql.slice(i, i + 2);
    if (two === '--') {                       // line comment
      const nl = sql.indexOf('\n', i);
      i = nl === -1 ? sql.length : nl;
    } else if (two === '/*') {                // block comment
      const end = sql.indexOf('*/', i + 2);
      i = end === -1 ? sql.length : end + 2;
    } else if (sql[i] === "'") {              // string literal, '' escapes a quote
      i++;
      while (i < sql.length) {
        if (sql[i] === "'" && sql[i + 1] === "'") { i += 2; continue; }
        if (sql[i] === "'") { i++; break; }
        i++;
      }
    } else if (two === '$$') {                // dollar-quoted body
      const end = sql.indexOf('$$', i + 2);
      i = end === -1 ? sql.length : end + 2;
    } else {
      out += sql[i];
      i++;
    }
  }
  return (out.match(/;/g) || []).length;
}

let bad = 0;
for (const file of process.argv.slice(2)) {
  const n = executableSemicolons(readFileSync(file, 'utf8'));
  const ok = n === 1;
  if (!ok) bad++;
  console.log(`${ok ? 'OK  ' : 'FAIL'}  ${file}  (${n} executable statement${n === 1 ? '' : 's'})`);
}
if (bad) {
  console.log(`\n${bad} file(s) would report only their last result in the Supabase editor.`);
  process.exit(1);
}
