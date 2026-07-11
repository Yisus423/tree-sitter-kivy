# Tasks: Comment Nodes

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~60-80 |
| 400-line budget risk | Low |
| Chained PRs recommended | Yes |
| Suggested split | PR 1: Grammar + scanner → PR 2: Tests + validation |
| Delivery strategy | force-chained |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Grammar rule + scanner changes + regeneration | PR 1 | `tree-sitter test -f "Comment-only"` | N/A — generated code, validated by Unit 2 | Revert grammar.js + scanner.c + parser.c |
| 2 | Corpus test updates + full validation | PR 2 | `tree-sitter test` | `tree-sitter parse examples/*.kv 2>&1 \| grep -c ERROR` — verify no new parse errors | Revert test/corpus/*.txt |

## Phase 1: Grammar + Scanner

- [x] 1.1 Add `comment` rule (`token(seq('#', /[^\n]*/))`) and register `$.comment` in `extras` in `grammar.js`
- [x] 1.2 Modify scanner Step 2 (~L255-287): remove `#` from `while` condition; delete entire `else if (lookahead == '#')` block incl. `#:` col-0 check
- [x] 1.3 Modify scanner Step 0b (~L158-179): remove `#` from `while` condition; delete entire `#` directive-handling block inside loop
- [x] 1.4 Modify scanner Step 0c (~L210-214): replace `advance_line(lexer)` with `return false;` for plain `#` fallthrough
- [x] 1.5 Run `tree-sitter generate` to regenerate `src/parser.c` and `src/tree_sitter/` bindings

## Phase 2: Tests

- [x] 2.1 Update `test/corpus/core-syntax.txt`: add `(comment)` node to expected trees for Comment-only file, Comment at byte 0, Comments inside rule body, and `#:` inside rule body
- [x] 2.2 Update `test/corpus/directives.txt`: add `(comment)` node to expected trees for Plain # comment (backward compat) and #: inside rule body cases

## Phase 3: Validation

- [x] 3.1 Run `tree-sitter test` — verify all corpus tests pass, no regressions, no behavioral changes in non-comment tests
