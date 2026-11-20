#!/usr/bin/env node
// Enforces the layer rules from design D1:
//   - firebase / @angular/fire may only be imported under src/app/data/
//   - domain/ imports nothing outside domain/ (no Angular, no rxjs, no other layers)
//   - application/ must not import from ui/ or data/
//   - ui/ must not import from data/
// Usage: node scripts/check-layers.mjs [dir ...]   (default: src/app)
import {readdirSync, readFileSync, statSync} from 'node:fs';
import {dirname, join, relative, resolve, sep} from 'node:path';

const APP = resolve('src/app');
const roots = process.argv.slice(2).length ? process.argv.slice(2).map(d => resolve(d)) : [APP];

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (p.endsWith('.ts')) yield p;
  }
}

const layerOf = file => {
  const rel = relative(APP, file);
  if (rel.startsWith('..')) return null;
  const first = rel.split(sep)[0];
  return ['domain', 'application', 'data', 'ui'].includes(first) ? first : 'root';
};

const importRe = /(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|import\s+['"]([^'"]+)['"]/g;
const violations = [];

for (const root of roots) {
  for (const file of walk(root)) {
    const layer = layerOf(file);
    const src = readFileSync(file, 'utf8');
    for (const m of src.matchAll(importRe)) {
      const spec = m[1] ?? m[2] ?? m[3];
      const isFirebase = spec === 'firebase' || spec.startsWith('firebase/') || spec.startsWith('@angular/fire');
      const target = spec.startsWith('.') ? layerOf(resolve(dirname(file), spec)) : null;
      const where = `${relative(process.cwd(), file)}: '${spec}'`;

      if (isFirebase && layer !== 'data') violations.push(`${where} - firebase is only allowed in data/`);
      if (layer === 'domain' && !spec.startsWith('.')) violations.push(`${where} - domain/ must not import packages`);
      if (layer === 'domain' && target && target !== 'domain') violations.push(`${where} - domain/ must not import ${target}/`);
      if (layer === 'application' && (target === 'ui' || target === 'data')) violations.push(`${where} - application/ must not import ${target}/`);
      if (layer === 'ui' && target === 'data') violations.push(`${where} - ui/ must not import data/`);
    }
  }
}

if (violations.length) {
  console.error(`Layer check failed (${violations.length} violation(s)):\n  ` + violations.join('\n  '));
  process.exit(1);
}
console.log('Layer check passed.');
