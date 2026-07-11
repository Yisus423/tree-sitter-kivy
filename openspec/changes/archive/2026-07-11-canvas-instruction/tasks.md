# Tasks: Canvas Instruction Node

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~30-50 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | force-chained |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Grammar + test update | Single PR | `tree-sitter test` | N/A — pure grammar change, no runtime | `git checkout HEAD -- grammar.js test/corpus/canvas.txt` |

## Phase 1: Grammar Changes

- [x] 1.1 Add `canvas_instruction` named rule in `grammar.js` after `_canvas_header` (body-ful + body-less variants)
- [x] 1.2 Modify `canvas_block` body: replace `choice($._declaration, $._canvas_atom)` with `choice($.comment, $.canvas_instruction)`
- [x] 1.3 Remove `_canvas_atom` rule from `grammar.js`
- [x] 1.4 Keep `$.canvas_block` in `_declaration` choice (deviation: literal removal makes `canvas_block` unreachable; nesting prevention achieved via restricted body content in `canvas_instruction`)

## Phase 2: Test Updates

- [x] 2.1 Update "Canvas with body instructions" S-expr: `widget_declaration` → `canvas_instruction` in `test/corpus/canvas.txt`
- [x] 2.2 Update "canvas.before block" S-expr: `widget_declaration` → `canvas_instruction`
- [x] 2.3 Update "canvas.after block" S-expr: `widget_declaration` → `canvas_instruction`
- [x] 2.4 Update "No-body canvas instructions" S-expr: add `(canvas_instruction name: (identifier))` nodes for Clear/PushMatrix/PopMatrix
- [x] 2.5 Update "Mixed content" S-expr: atoms → `canvas_instruction` body-less, Color/Rectangle → `canvas_instruction` body-ful
- [x] 2.6 Verify "Empty canvas block" and "Backward compat" tests need no update

## Phase 3: Verification

- [x] 3.1 Run `tree-sitter test` — all 73 non-canvas tests pass unchanged
- [x] 3.2 Run `tree-sitter test` — 6 updated canvas tests match new S-expressions, plus backward compat test
