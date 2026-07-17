# Tasks: Rename `property_value` → `value`, Remove `event_statement`

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~60-80 (authored) + ~3000 (generated, excluded) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | auto-chain |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Grammar rename + regenerate + update all refs | PR 1 | `grep -r 'property_value\|event_statement' grammar.js queries/ test/` | `tree-sitter generate && tree-sitter test` | `git revert` single commit |

## Phase 1: Grammar Changes

- [x] 1.1 Rename `property_value` rule → `value` in `grammar.js`
- [x] 1.2 Add hidden `_expression_line` rule (`_expression_line: $ => token(...)`) to `grammar.js`
- [x] 1.3 Update `event_body` to use `_expression_line` instead of `event_statement`; update `event_binding` inline handler to use `value` instead of `property_value`
- [x] 1.4 Remove `event_statement` rule from `grammar.js`
- [x] 1.5 Run `tree-sitter generate` to regenerate `src/parser.c` and `src/grammar.json`

## Phase 2: Update Queries, Tests & References

- [x] 2.1 Remove `(event_statement) @embedded` from `queries/highlights.scm`; update any `property_value` refs there
- [x] 2.2 Change `(property_value)` → `(value)` in `queries/injections.scm`
- [x] 2.3 Update `test/corpus/core-syntax.txt`: all `(property_value)` → `(value)`, remove `(event_statement)` from S-expressions
- [x] 2.4 Update `test/e2e/verify.mjs` if it references `property_value`

## Phase 3: Verification

- [x] 3.1 Run `grep -r 'property_value\|event_statement' grammar.js queries/ test/` — ✅ zero matches
- [x] 3.2 Run `tree-sitter test` — ✅ 108/108 pass (100%)
- [x] 3.3 Run `tree-sitter parse` on sample `.kv` files — ✅ `(value)` not `(property_value)` in CST output
- [x] 3.4 Confirm hidden `_expression_line` exists: `grep '_expression_line' grammar.js` shows the rule ✅
