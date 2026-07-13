# Tasks: Template Rules for kvlang

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~50-80 authored + ~500 generated in `src/parser.c` |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | auto-forecast |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Add template rules to grammar + corpus tests + regenerate | PR 1 | `tree-sitter test` | `tree-sitter generate && tree-sitter test` | `git revert` grammar.js changes + `tree-sitter generate` to restore `src/parser.c` |

## Phase 1: Grammar Changes

- [x] 1.1 Add `template_entry` rule to `grammar.js` with required `name` field and optional `@base+base2` bases (mirrors `class_entry` without `@Base`-only form)
- [x] 1.2 Add `template_rule` rule to `grammar.js` using `[...]:` delimiters + `optional($._rule_body)` — mirrors `class_rule` structure
- [x] 1.3 Add `$.template_rule` to the `_rule` choice in `grammar.js`

## Phase 2: Generation & Verification

- [x] 2.1 Create `test/corpus/template_rules.txt` with corpus tests covering spec scenarios: name-only, name+base, name+multi-base, empty-bracket ERROR, `@`-only ERROR, body variants (properties, children, canvas, no-body)
- [x] 2.2 Run `tree-sitter generate` to regenerate `src/parser.c`
- [x] 2.3 Run `tree-sitter test` — confirm all new and existing corpus tests pass

## Phase 3: Final Regression Check

- [x] 3.1 Run `tree-sitter test` one final time — verify zero regressions in all existing corpus files
