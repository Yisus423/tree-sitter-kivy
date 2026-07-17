# Apply Progress: Rename `property_value` → `value`, Remove `event_statement`

## Summary

Mechanical rename + grammar cleanup. All 13 tasks completed in a single batch. No new behavior.
Grammar, queries, tests, and generated parser updated in lockstep.

## Work Unit Evidence

| Evidence | Required value |
|----------|----------------|
| Focused test command | `grep -r 'property_value\|event_statement' grammar.js queries/ test/` → ✅ zero matches |
| Runtime harness | `tree-sitter generate && tree-sitter test` → ✅ 108/108 tests pass, 100% |
| Rollback boundary | `git revert` single commit — all changes are in grammar.js, query files, corpus tests, and generated files |

## Completed Tasks

### Phase 1: Grammar Changes
- [x] 1.1 Rename `property_value` → `value` in `grammar.js`
- [x] 1.2 Add hidden `_expression_line` rule
- [x] 1.3 Update `event_body` → `_expression_line`; update `event_binding` inline handler → `value`; update `property` → `value`
- [x] 1.4 Remove `event_statement` rule
- [x] 1.5 Run `tree-sitter generate`

### Phase 2: Update Queries, Tests & References
- [x] 2.1 Remove `(event_statement) @embedded` from `highlights.scm`; update comments
- [x] 2.2 `(property_value)` → `(value)` in `injections.scm`
- [x] 2.3 Update all corpus tests: `(property_value)` → `(value)`, remove `(event_statement)` from S-expressions
- [x] 2.4 `verify.mjs` — no references found (clean)

### Phase 3: Verification
- [x] 3.1 Old-name grep → ✅ zero matches
- [x] 3.2 `tree-sitter test` → ✅ 108/108 pass
- [x] 3.3 `tree-sitter parse` simple-app.kv → ✅ `(value)` in CST, no `(property_value)`
- [x] 3.4 `_expression_line` in grammar.js ✅

## Files Changed

| File | Action | What Was Done |
|------|--------|---------------|
| `grammar.js` | Modified | Rename `property_value`→`value`, add `_expression_line`, remove `event_statement`, update `event_body`/`event_binding`/`property` refs |
| `src/parser.c` | Regenerated | Via `tree-sitter generate` |
| `src/grammar.json` | Regenerated | Via `tree-sitter generate` |
| `src/node-types.json` | Regenerated | Via `tree-sitter generate` |
| `src/tree_sitter/array.h` | Regenerated | Via `tree-sitter generate` |
| `queries/highlights.scm` | Modified | Remove `(event_statement) @embedded`, update comments |
| `queries/injections.scm` | Modified | `(property_value)`→`(value)`, update comments |
| `queries/locals.scm` | Modified | Update comment referencing old name |
| `test/corpus/core-syntax.txt` | Modified | 47+ occurrences updated (rename + event_statement removal) |
| `test/corpus/canvas.txt` | Modified | 20 `property_value`→`value` renames |
| `test/corpus/kitchen-sink.txt` | Modified | 22 `property_value`→`value` renames |
| `test/corpus/directives.txt` | Modified | 1 `property_value`→`value` rename |
| `test/corpus/template_rules.txt` | Modified | 2 `property_value`→`value` renames |

## Deviations from Design

None — implementation matches spec.

## Issues Found

None significant. One test input line had a pre-existing 10-space indent that was fixed during implementation.

## Verification Results

- `grep -r 'property_value\|event_statement' grammar.js queries/ test/` → ✅ zero matches
- `tree-sitter generate` → ✅ no errors
- `tree-sitter test` → ✅ 108/108 (100%)
- `tree-sitter parse test/e2e/fixtures/simple-app.kv` → ✅ `(value)` nodes present, no `(property_value)`
- `grep '_expression_line' grammar.js` → ✅ shows `_expression_line` rule definition and usage

## Workload / PR Boundary

- Mode: single PR (auto-chain, low risk)
- Current work unit: Unit 1 — all 13 tasks
- Estimated review budget: ~60-80 authored lines (well under 400)
- Next: sdd-verify or sdd-archive
