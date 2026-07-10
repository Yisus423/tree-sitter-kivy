# Tasks: Global and Negated Class Rules

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~85-110 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR (size exception) |
| Delivery strategy | exception-ok |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Grammar change + all tests | Single PR | No split needed (~85-110 lines) |

## Phase 1: Grammar — class_rule Production

- [x] 1.1 `grammar.js` — Wrap `class_rule` angle-bracket content in `choice()`:
  - Branch 1: `seq('-', field('negated', $.identifier))` for negated rules
  - Branch 2: existing pattern (standard, global, and dynamic class rules)
- [x] 1.2 Run `tree-sitter test` — confirm all existing tests pass unchanged

## Phase 2: Tests — Corpus Coverage

- [x] 2.1 Add test: global rule no body `<>:` → `(class_rule)` with no fields
- [x] 2.2 Add test: global rule with body + property → `class_rule` with children
- [x] 2.3 Add test: negated rule no body `<-Button>:` → `(class_rule negated: (identifier))`
- [x] 2.4 Add test: negated rule with body + property → negated field + children
- [x] 2.5 Add test: error case `<-Name@Base>:` → ERROR node
- [x] 2.6 Run `tree-sitter test` — confirm all 5 new cases pass plus regression

## Phase 3: Verify

- [x] 3.1 Regenerate parser with `tree-sitter generate`
- [x] 3.2 Run full test suite — confirm zero regressions
