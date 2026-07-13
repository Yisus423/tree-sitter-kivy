# Tasks: #:include Directive Support

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~46 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | auto-forecast |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Grammar rule + tests + regenerate | PR 1 | `tree-sitter test -f include` | `tree-sitter test` on full corpus | `git revert` single commit — purely additive |

## Phase 1: Grammar Implementation

- [x] 1.1 Add `include_directive` rule in `grammar.js`: `seq(_directive_start, 'include', field('path', directive_value), _newline)`
- [x] 1.2 Wire `$.include_directive` into `_directive` choice in `grammar.js`

## Phase 2: Corpus Tests

- [x] 2.1 Add test: `#:include myfile.kv` → `(include_directive path: (directive_value))`
- [x] 2.2 Add test: `#:include force myfile.kv` → `"force myfile.kv"` in directive_value (no structured field)
- [x] 2.3 Add test: `#:include subdir/nested/file.kv` → path with directory separators
- [x] 2.4 Add test: Mixed `#:import`, `#:include`, `#:set` → all parse without ERROR
- [x] 2.5 Add test: `#:include` with no path → ERROR node

## Phase 3: Build & Verify

- [x] 3.1 Regenerate parser: `tree-sitter generate`
- [x] 3.2 Run `tree-sitter test` — all 177 existing + new tests pass
