#!/usr/bin/env node
/**
 * e2e Verification Script for tree-sitter-kivy
 *
 * Verifies that:
 * 1. All fixtures parse without ERROR nodes
 * 2. All query files are valid and produce expected captures on fixtures
 * 3. Build artifacts (WASM) compile correctly
 *
 * Usage: node test/e2e/verify.mjs
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const FIXTURES_DIR = join(__dirname, 'fixtures');
const QUERIES_DIR = join(ROOT, 'queries');

const FIXTURES = ['simple-app.kv', 'complex-canvas.kv'];
const QUERY_FILES = ['highlights.scm', 'locals.scm', 'tags.scm', 'injections.scm'];

// ============================================================
// Helpers
// ============================================================

function run(cmd, opts = {}) {
  return execSync(cmd, {
    cwd: ROOT,
    encoding: 'utf-8',
    timeout: 30000,
    ...opts,
  });
}

function countErrors(parseOutput) {
  // Count ERROR nodes in tree-sitter parse output
  return (parseOutput.match(/\bERROR\b/g) || []).length;
}

function runQuery(queryFile, fixture) {
  const queryPath = join(QUERIES_DIR, queryFile);
  const fixturePath = join(FIXTURES_DIR, fixture);
  try {
    const output = run(`npx tree-sitter query --captures "${queryPath}" "${fixturePath}"`);
    return { ok: true, output };
  } catch (e) {
    return { ok: false, error: e.stderr || e.message };
  }
}

function runQueryRaw(queryFile, fixture) {
  const queryPath = join(QUERIES_DIR, queryFile);
  const fixturePath = join(FIXTURES_DIR, fixture);
  try {
    const output = run(`npx tree-sitter query "${queryPath}" "${fixturePath}"`);
    return { ok: true, output };
  } catch (e) {
    return { ok: false, error: e.stderr || e.message };
  }
}

function parseFixture(fixture) {
  const fixturePath = join(FIXTURES_DIR, fixture);
  try {
    const output = run(`npx tree-sitter parse "${fixturePath}"`);
    return { ok: true, output };
  } catch (e) {
    return { ok: false, error: e.stderr || e.message };
  }
}

function checkCapture(output, captureName) {
  // Check if a specific capture name appears in the query output
  // Format (--captures): "pattern: XX, capture: N - captureName, start: ..."
  return output.includes(`- ${captureName}, start:`);
}

function checkCaptureText(output, captureName, text) {
  // Check a specific capture name with matching text content
  // Format: "capture: N - captureName, start: (x, y), end: (x, y), text: `content`"
  const pattern = new RegExp(`- ${captureName}, start:.*text: \`${escapeRegex(text)}\``);
  return pattern.test(output);
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ============================================================
// Categories of expected captures per query file
// ============================================================

const EXPECTED_HIGHLIGHTS = {
  'simple-app.kv': [
    { capture: 'keyword', text: 'kivy', desc: '#:kivy directive keyword' },
    { capture: 'keyword.import', text: 'import', desc: '#:import directive keyword' },
    { capture: 'module', text: 'FloatLayout', desc: 'Import alias' },
    { capture: 'string.special.path', text: ' kivy.uix.floatlayout', desc: 'Import module path' },
    { capture: 'constant', text: 'default_bg', desc: '#:set name' },
    { capture: 'type.definition', text: 'CustomButton', desc: 'Dynamic class name' },
    { capture: 'type', text: 'Button', desc: 'Base class in dynamic rule' },
    { capture: 'type.definition', text: 'MainScreen', desc: 'Class rule name' },
    { capture: 'function', text: 'FloatLayout', desc: 'Widget declaration' },
    { capture: 'function', text: 'Label', desc: 'Widget declaration' },
    { capture: 'function', text: 'CustomButton', desc: 'Widget declaration' },
    { capture: 'property', text: 'font_size', desc: 'Property name' },
    { capture: 'property', text: 'text', desc: 'Property name' },
    { capture: 'property', text: 'size_hint', desc: 'Property name' },
    { capture: 'number', text: '16', desc: 'Number value' },
    { capture: 'string', text: '"Welcome to Kivy"', desc: 'String value' },
    { capture: 'boolean', text: 'True', desc: 'Boolean value' },
    { capture: 'attribute', text: 'on_press', desc: 'Event binding name' },
    { capture: 'function.method', text: 'app.handle_click', desc: 'Event handler (dotted_ref)' },
    { capture: 'keyword', text: 'canvas.before', desc: 'Canvas block header' },
    { capture: 'keyword.function', text: 'Color', desc: 'Canvas instruction' },
    { capture: 'keyword.function', text: 'Rectangle', desc: 'Canvas instruction' },
    { capture: 'variable.special', text: 'title_label', desc: 'ID declaration name' },
    { capture: 'punctuation.bracket', desc: 'Brackets' },
    { capture: 'punctuation.delimiter', desc: 'Delimiters' },
    { capture: 'operator', text: '@', desc: 'Base class operator' },
    { capture: 'variable.member', text: 'self.size', desc: 'Dotted reference' },
    { capture: 'comment', text: '# Main container with background', desc: 'Comment' },
  ],
  'complex-canvas.kv': [
    { capture: 'type.definition', text: 'GradientButton', desc: 'Dynamic class in complex fixture' },
    { capture: 'type.definition', text: 'Dashboard', desc: 'Class rule in complex fixture' },
    { capture: 'function', text: 'BoxLayout', desc: 'Widget in complex fixture' },
    { capture: 'function', text: 'Label', desc: 'Widget in complex fixture' },
    { capture: 'function', text: 'Widget', desc: 'No-body widget' },
    { capture: 'keyword', text: 'canvas.before', desc: 'canvas.before in complex fixture' },
    { capture: 'keyword', text: 'canvas', desc: 'canvas in complex fixture' },
    { capture: 'keyword.function', text: 'Color', desc: 'Canvas Color instruction' },
    { capture: 'keyword.function', text: 'RoundedRectangle', desc: 'RoundedRect instruction' },
    { capture: 'keyword.function', text: 'Line', desc: 'Canvas Line instruction' },
    { capture: 'property', text: 'orientation', desc: 'BoxLayout orientation' },
    { capture: 'property', text: 'padding', desc: 'BoxLayout padding' },
    { capture: 'property', text: 'spacing', desc: 'BoxLayout spacing' },
    { capture: 'string', text: '"Dashboard"', desc: 'String value' },
    { capture: 'number', text: '32', desc: 'font_size value' },
    { capture: 'operator', text: '@', desc: 'Base class operator' },
  ],
};

const EXPECTED_LOCALS = {
  'simple-app.kv': [
    { capture: 'local.scope', desc: 'Scope definitions' },
    { capture: 'local.definition.type', text: 'CustomButton', desc: 'Type definition' },
    { capture: 'local.definition.type', text: 'MainScreen', desc: 'Type definition' },
    { capture: 'local.definition.import', text: 'FloatLayout', desc: 'Import definition' },
    { capture: 'local.definition.constant', text: 'default_bg', desc: 'Constant definition' },
    { capture: 'local.definition.variable', text: 'title_label', desc: 'Variable definition' },
  ],
  'complex-canvas.kv': [
    { capture: 'local.definition.type', text: 'GradientButton', desc: 'Type definition' },
    { capture: 'local.definition.type', text: 'Dashboard', desc: 'Type definition' },
    { capture: 'local.scope', desc: 'Scope definitions' },
  ],
};

const EXPECTED_TAGS = {
  'simple-app.kv': [
    { capture: 'definition.class', text: 'CustomButton@Button', desc: 'Class definition (dynamic)' },
    { capture: 'definition.class', text: 'MainScreen', desc: 'Class definition' },
    { capture: 'definition.import', desc: 'Import definition (text includes full directive range)' },
    { capture: 'definition.constant', desc: 'Constant definition' },
    { capture: 'definition.variable', desc: 'Variable definition' },
  ],
  'complex-canvas.kv': [
    { capture: 'definition.class', text: 'GradientButton@Button', desc: 'Class definition (dynamic)' },
    { capture: 'definition.class', text: 'Dashboard', desc: 'Class definition' },
  ],
};

const EXPECTED_INJECTIONS = {
  'simple-app.kv': [
    { capture: 'injection.content', desc: 'Injection content capture' },
  ],
  'complex-canvas.kv': [
    { capture: 'injection.content', desc: 'Injection content capture' },
  ],
};

// ============================================================
// Test runner
// ============================================================

let passed = 0;
let failed = 0;
let total = 0;

function test(name, fn) {
  total++;
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ❌ ${name}`);
    console.log(`      ${e.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

// ============================================================
// 1. Parse tests — verify no ERROR nodes
// ============================================================

console.log('\n📦 Phase 1: Parse fixtures without ERROR nodes\n');

for (const fixture of FIXTURES) {
  test(`Parse ${fixture}`, () => {
    const result = parseFixture(fixture);
    assert(result.ok, `Parse failed: ${result.error}`);
    const errors = countErrors(result.output);
    assert(errors === 0, `Expected 0 ERROR nodes, found ${errors}`);
  });
}

// ============================================================
// 2. Query tests — verify expected captures exist
// ============================================================

console.log('\n🔍 Phase 2: Query capture verification\n');

const CAPTURE_CHECKS = {
  'highlights.scm': EXPECTED_HIGHLIGHTS,
  'locals.scm': EXPECTED_LOCALS,
  'tags.scm': EXPECTED_TAGS,
  'injections.scm': EXPECTED_INJECTIONS,
};

for (const queryFile of QUERY_FILES) {
  console.log(`  ${queryFile}:`);

  for (const fixture of FIXTURES) {
    const expectedList = CAPTURE_CHECKS[queryFile]?.[fixture];
    if (!expectedList || expectedList.length === 0) {
      console.log(`    ⏭️  ${fixture} — no checks defined`);
      continue;
    }

    const result = runQuery(queryFile, fixture);
    assert(result.ok, `Query ${queryFile} on ${fixture} failed: ${result.error}`);

    for (const { capture, text, desc } of expectedList) {
      test(`${queryFile} → ${fixture}: ${desc}`, () => {
        if (text) {
          const ok = checkCaptureText(result.output, capture, text);
          assert(ok, `Capture '${capture}' with text '${text}' not found`);
        } else {
          const ok = checkCapture(result.output, capture);
          assert(ok, `Capture '${capture}' not found`);
        }
      });
    }
  }
}

// ============================================================
// 3. Query validity — all queries run without errors
// ============================================================

console.log('\n📐 Phase 3: Query file validity\n');

for (const queryFile of QUERY_FILES) {
  test(`Query file ${queryFile} is valid`, () => {
    // Run the query against any fixture; verify it doesn't crash
    const result = runQueryRaw(queryFile, FIXTURES[0]);
    assert(result.ok, `Query ${queryFile} failed: ${result.error}`);
    assert(result.output.includes('pattern:'), `Query ${queryFile} produced no output`);
  });
}

// ============================================================
// 4. Build check — WASM compilation
// ============================================================

console.log('\n🏗️  Phase 4: WASM build\n');

test('tree-sitter build --wasm', () => {
  const output = run('npx tree-sitter build --wasm 2>&1');
  const wasmPath = join(ROOT, 'tree-sitter-kivy.wasm');
  assert(existsSync(wasmPath), 'WASM file not found after build');
  const wasmSize = readFileSync(wasmPath).length;
  assert(wasmSize > 0, `WASM file is empty (${wasmSize} bytes)`);
});

// ============================================================
// Summary
// ============================================================

console.log('\n' + '='.repeat(50));
console.log(`\n📊 Results: ${passed}/${total} passed`);
if (failed > 0) {
  console.log(`   ${failed} test(s) failed ❌`);
  process.exit(1);
} else {
  console.log('   All tests passed! ✅\n');
}
