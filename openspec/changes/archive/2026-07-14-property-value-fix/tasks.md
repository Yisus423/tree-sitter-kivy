# Tasks: Property Value Fix

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~25 (grammar.js + corpus test) + generated parser.c (excluded) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Single PR — rename + restructure + test | PR 1 | `tree-sitter test` | N/A — grammar change, no runtime | `git revert` |

## Phase 1: RED — Write failing test first

- [x] 1.1 Add corpus test case for `size_hint: (root.x + root.y)` expecting `(property_value (raw_value))` with no ERROR — will fail before grammar changes

## Phase 2: GREEN — Implement grammar changes

- [x] 2.1 Rename `_raw_value` → `raw_value` in grammar.js — **DEVIATION**: kept `_raw_value` as hidden suffix token, added new named `raw_value` rule for paren catch-all (design choice approach didn't work — Tree-sitter GLR always prefers catch-all token over typed alternatives)
- [x] 2.2 Restructure `property_value` — **DEVIATION**: kept `seq(choice(...), optional(_raw_value))` and added `$.raw_value` inside the inner choice (parenthesized catch-all via `_paren_token` with pattern `[^,)\n\r]+`). Merged 2.1+2.2 into single grammar edit
- [x] 2.3 Run `tree-sitter generate` to regenerate `src/parser.c` (and `src/grammar.json`)

## Phase 3: Verify

- [x] 3.1 Run `tree-sitter test` — 103/103 tests pass (100%)
- [x] 3.2 Confirm no stale `_raw_value` references remain in grammar.js — `_raw_value` intentionally kept as hidden suffix (not stale); no stale refs elsewhere
