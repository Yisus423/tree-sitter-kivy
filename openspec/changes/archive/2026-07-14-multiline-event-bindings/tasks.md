# Tasks: Multiline Event Bindings

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~65 (grammar.js + corpus tests) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | auto-chain |
| Decision needed before apply | No |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

## Phase 1: Corpus Tests — RED

- [x] 1.1 Write failing test: two-statement multiline body `on_release:\n    root.go()\n    root.stop()`
- [x] 1.2 Write failing test: single-statement multiline `on_press:\n    self.action()`
- [x] 1.3 Write failing test: multiline body → next declaration `on_release:\n    root.cleanup()\n  text: "Done"`
- [x] 1.4 Write failing test: comment inside body `on_release:\n    # comment\n    root.start()`
- [x] 1.5 Write failing test: blank lines inside body `on_release:\n    root.a()\n\n    root.b()`

## Phase 2: Grammar Implementation — GREEN

- [x] 2.1 Modify `event_binding` at grammar.js:171-176 to wrap handler in `choice(field('handler', $.property_value), field('handler', $.event_body))`
- [x] 2.2 Add `event_body` rule with `seq($._indent, repeat(choice($.event_statement, seq($.comment, optional($._newline)))), $._dedent)`
- [x] 2.3 Add `event_statement` rule with `seq(token(/[^\n\r]+/), optional($._newline))`

## Phase 3: Regenerate & Verify

- [x] 3.1 Run `tree-sitter generate` to rebuild `src/parser.c`
- [x] 3.2 Run `tree-sitter test` — all 5 new tests pass, all existing tests remain green
