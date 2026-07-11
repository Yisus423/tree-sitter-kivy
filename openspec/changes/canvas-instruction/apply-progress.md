# Apply Progress: canvas-instruction

**Mode**: Strict TDD
**Workload**: size-exception (single PR, ~30-50 lines)
**Status**: 12/12 tasks complete. Ready for verify.

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1.1-1.3 | `test/corpus/canvas.txt` | Corpus | ✅ 80/80 | ✅ Tests updated first | ✅ Grammar passes 80/80 | ✅ 7 cases | ✅ Clean |
| 1.4 | `grammar.js` | Grammar | ✅ 80/80 | ✅ Tests set before edits | ✅ Parser regenerated | — | ✅ Clean |
| 2.1-2.6 | `test/corpus/canvas.txt` | Corpus | ✅ 80/80 | ✅ Written before grammar | ✅ 80/80 after rebuild | — | ✅ Clean |
| 3.1-3.2 | All corpus | Full suite | ✅ 80/80 | N/A (verification) | ✅ 80/80 | — | ✅ Clean |

## Work Unit Evidence

| Evidence | Value |
|---|---|
| Focused test | `tree-sitter test` → 80/80 passing, 100.00% |
| Runtime harness | N/A — pure grammar change, no runtime |
| Rollback boundary | `grammar.js` + `test/corpus/canvas.txt` + `src/parser.c` |

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `grammar.js` | Modified | Added `canvas_instruction` rule, updated `canvas_block` body, removed `_canvas_atom` |
| `test/corpus/canvas.txt` | Modified | Updated 5 S-expression expectations |
| `src/parser.c` | Regenerated | `tree-sitter generate` output |

## Deviation from Design

**Task 1.4**: Kept `$.canvas_block` in `_declaration` (removing it makes `canvas_block` unreachable). Nesting prevention achieved via restricted body content in `canvas_instruction`.

## Issues Found

`tree-sitter build` does NOT regenerate `src/parser.c`. Must run `tree-sitter generate` first.
