#!/usr/bin/env node
// extract-app-blocks.mjs — pull the data objects out of App.jsx as JSON.
//
// WHY THIS EXISTS
//   App.jsx is a .jsx file, so the data tables inside it cannot be imported by
//   a plain script. Every ad-hoc attempt to grep them out has the same bug: a
//   naive brace counter breaks on apostrophes inside the prose notes ("LAC's
//   11-PERSONNEL TIGHT END"), on // inside a string, and on nested objects.
//   This walks the source with a real string/comment state machine instead.
//
// USAGE
//   node scripts/extract-app-blocks.mjs > blocks.json
//   node scripts/extract-app-blocks.mjs ADP_YAHOO SITUATIONS > two.json
//
// OUTPUT
//   { "<BLOCK_NAME>": { ...the object... }, ... }
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const APP = path.join(HERE, '..', 'App.jsx');
const DEFAULT_BLOCKS = ['ADP_DATA', 'ADP_SUPERFLEX', 'ADP_YAHOO', 'SITUATIONS', 'RECENT_NEWS', 'TEAM_ENV'];

function grab(src, name) {
  const start = src.indexOf(`const ${name} = {`);
  if (start < 0) return null;
  let i = src.indexOf('{', start);
  let depth = 0, j = i, inStr = null, esc = false;
  while (j < src.length) {
    const c = src[j];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === inStr) inStr = null;
    } else {
      if (c === '"' || c === "'" || c === '`') inStr = c;
      else if (c === '/' && src[j + 1] === '/') { while (j < src.length && src[j] !== '\n') j++; }
      else if (c === '{') depth++;
      else if (c === '}') { depth--; if (depth === 0) { j++; break; } }
    }
    j++;
  }
  // eslint-disable-next-line no-eval
  return eval('(' + src.slice(i, j) + ')');
}

const src = fs.readFileSync(APP, 'utf8');
const wanted = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_BLOCKS;
const out = {};
for (const name of wanted) {
  const v = grab(src, name);
  if (v) { out[name] = v; process.stderr.write(`  ${name}: ${Object.keys(v).length} keys\n`); }
  else process.stderr.write(`  ${name}: NOT FOUND\n`);
}
process.stdout.write(JSON.stringify(out));
