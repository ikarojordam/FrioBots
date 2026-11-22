'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
function jsFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? jsFiles(file) : entry.isFile() && entry.name.endsWith('.js') ? [file] : [];
  });
}
test('all literal relative require paths resolve to files', () => {
  const missing = [];
  for (const file of jsFiles(root)) {
    const source = fs.readFileSync(file, 'utf8');
    const regex = /\brequire\s*\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)/g;
    for (const match of source.matchAll(regex)) {
      const resolved = path.resolve(path.dirname(file), match[1]);
      if (![resolved, `${resolved}.js`, `${resolved}.json`, path.join(resolved, 'index.js')].some(p => fs.existsSync(p))) {
        missing.push(`${path.relative(root, file)}: ${match[1]}`);
      }
    }
  }
  assert.deepEqual(missing, [], `Broken local imports: ${missing.join(', ')}`);
});
