#!/usr/bin/env node
/**
 * Validates _projects/*.json so a malformed entry from the CMS can't reach
 * production and break the whole gallery (the front does Promise.all over every
 * file — one bad JSON throws and the grid falls back to a single hardcoded card).
 *
 * Errors  -> exit 1 (block the merge).
 * Warnings -> printed, but do not fail (e.g. legacy invalid YouTube IDs).
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIR = '_projects';
const REQUIRED = ['title', 'youtube_id', 'category'];
const ALLOWED_CATEGORIES = new Set(['comp', 'sup', 'comp sup', 'sup comp']);

let errors = 0;
let warnings = 0;
const warn = (m) => { console.warn('⚠️  ' + m); warnings++; };
const fail = (m) => { console.error('❌ ' + m); errors++; };

const entries = readdirSync(DIR);

// The gallery only reads .json — flag anything else so the editor knows it's ignored.
const ignored = entries.filter((f) => !f.endsWith('.json'));
if (ignored.length) warn(`Ignored by the gallery (not .json): ${ignored.join(', ')}`);

const jsonFiles = entries.filter((f) => f.endsWith('.json'));
if (jsonFiles.length === 0) {
  fail('No .json project files found in _projects/');
  process.exit(1);
}

for (const file of jsonFiles) {
  let data;
  try {
    data = JSON.parse(readFileSync(join(DIR, file), 'utf8'));
  } catch (e) {
    fail(`${file}: invalid JSON — ${e.message}`);
    continue;
  }
  for (const key of REQUIRED) {
    if (data[key] == null || String(data[key]).trim() === '') {
      fail(`${file}: missing required field "${key}"`);
    }
  }
  if (data.category && !ALLOWED_CATEGORIES.has(String(data.category).toLowerCase().trim())) {
    fail(`${file}: category "${data.category}" is not one of {comp, sup, comp sup}`);
  }
  if (data.youtube_id && String(data.youtube_id).trim().length !== 11) {
    warn(`${file}: youtube_id "${data.youtube_id}" is ${String(data.youtube_id).trim().length} chars (YouTube IDs are 11) — the video may not load`);
  }
}

console.log(`\nChecked ${jsonFiles.length} project file(s): ${errors} error(s), ${warnings} warning(s).`);
process.exit(errors ? 1 : 0);
