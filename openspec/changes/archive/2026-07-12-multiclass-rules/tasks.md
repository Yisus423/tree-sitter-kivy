# Tasks: Multiclass Class Rules in kvlang

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~80–100 authored |
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
| 1 | Grammar + regenerate + tests | PR 1 | `tree-sitter generate && tree-sitter test` | N/A — grammar-only change, no runtime | `git revert` on grammar.js + test file |

## Phase 1: Grammar Change

- [x] 1.1 Add `class_entry` named rule to `grammar.js` with optional `name` field and optional `@base` with `+`-separated repeat
- [x] 1.2 Restructure `class_rule` in `grammar.js` as `choice()` between negated single-entry (`seq('-', identifier)`) and `class_entry` with `repeat(seq(',', class_entry))`

## Phase 2: Regenerate Parser

- [x] 2.1 Run `tree-sitter generate` to produce `src/parser.c`, `src/grammar.json`, `src/node-types.json`
- [x] 2.2 Confirm generation produces no errors

## Phase 3: Test Updates

- [x] 3.1 Update 7 existing corpus CSTs in `test/corpus/core-syntax.txt` — wrap each non-negated class rule entry in `(class_entry ...)`
- [x] 3.2 Add 6 new multiclass tests: `<A, B>:`, `<A, B, C>:`, `<Custom@Button, Icon@Label>:`, multiclass with body, trailing comma ERROR, negated-in-multiclass ERROR
- [x] 3.3 Run `tree-sitter test` and verify all tests pass
