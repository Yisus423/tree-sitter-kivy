# Tasks: Canvas Blocks

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~100-140 |
| 400-line budget risk | Low |
| Chained PRs recommended | Yes (force-chained) |
| Suggested split | Unit 1 → PR 1 (grammar + generate), Unit 2 → PR 2 (corpus tests) |
| Delivery strategy | force-chained |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Grammar rules + generate + backward compat | PR 1 → main | `grammar.js` changes, `tree-sitter generate`, verify all 37 existing tests pass |
| 2 | Canvas corpus tests | PR 2 → main | `test/corpus/canvas.txt` with ~8 tests; verify all tests pass |

## Phase 1: Grammar Rules

- [x] 1.1 Add `_canvas_header` rule: `choice('canvas.before', 'canvas.after', 'canvas')` in `grammar.js`
- [x] 1.2 Add `canvas_block` rule: header + `:` + optional indent/dedent body reusing `_declaration` + `_canvas_atom`
- [x] 1.3 Add `_canvas_atom` rule: `choice('Clear', 'PushMatrix', 'PopMatrix')` + NEWLINE
- [x] 1.4 Modify `_declaration` choice to include `$.canvas_block` as first option

## Phase 2: Corpus Tests

- [x] 2.1 Create `test/corpus/canvas.txt` — empty canvas block test
- [x] 2.2 Add test: canvas with body instructions (Color + Rectangle)
- [x] 2.3 Add test: `canvas.before:` block
- [x] 2.4 Add test: `canvas.after:` block
- [x] 2.5 Add test: no-body instructions (Clear, PushMatrix, PopMatrix)
- [x] 2.6 Add test: mixed content (properties + atoms + instructions in same canvas)
- [x] 2.7 Add test: backward compat — non-canvas `color:` as property (no ERROR regression)

## Phase 3: Generate, Build, Test

- [x] 3.1 Run `tree-sitter generate && tree-sitter build --wasm` to regenerate parser from grammar.js
- [x] 3.2 Run `tree-sitter test` to verify all 37 existing tests pass
