# Tasks: Dynamic Class Rules

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~45–50 |
| 400-line budget risk | Low |
| Chained PRs recommended | Yes |
| Suggested split | Single PR (stacked-to-main) |
| Delivery strategy | force-chained |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Grammar + tests + generate | PR 1 | Single slice, stacks to main. Risk: Low. |

## Phase 1: Grammar Change

- [x] 1.1 Edit `grammar.js` — extend `class_rule` seq with `optional(seq('@', field('base', $.identifier), repeat(seq('+', field('base', $.identifier)))))` inside angle brackets
- [x] 1.2 Verify existing `class_rule` structure is unchanged for `<Name>:` without `@` (backward compat)

## Phase 2: Test Cases

- [x] 2.1 Add corpus test to `test/corpus/core-syntax.txt`: `<CustomButton@Button>:` — expect `class_rule` with name "CustomButton" and single base "Button"
- [x] 2.2 Add corpus test: `<NewWidget@Behavior+Label>:` — expect `class_rule` with name "NewWidget" and two base fields "Behavior", "Label"
- [x] 2.3 Add corpus test: `<@Button>:` — expect ERROR state (missing name + parsed base)

## Phase 3: Generate & Verify

- [x] 3.1 Run `tree-sitter generate` to regenerate `src/parser.c`
- [x] 3.2 Run `tree-sitter test` — confirm all existing 44 tests pass unchanged
- [x] 3.3 Run `tree-sitter test` — confirm 3 new dynamic-class test cases pass
