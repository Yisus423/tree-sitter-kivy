# Tasks: Directives

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~280 (human-written: 40 scanner + 40 grammar + 200 tests) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR — under budget, single concern |
| Delivery strategy | force-chained |
| Chain strategy | stacked-to-main |

**Decision needed before apply**: No (280 lines is under the 400-line review budget, no splitting needed)

## Phase 1: Scanner — `src/scanner.c`

- [x] 1.1 Add `DIRECTIVE_START` to `TokenType` enum as 5th token (after `BREAK`) — `src/scanner.c` line 13
- [x] 1.2 Add `try_directive_start()` helper: after `#` consumed by caller, check `lookahead == ':'` → advance + return true; else `advance_line()` + return false — placed before `tree_sitter_kivy_external_scanner_scan`
- [x] 1.3 Modify BREAK path (Step 0b): in the `#` branch of the blank‑line loop, consume `#` with `advance(lexer, false)`, then if `lookahead == ':'` consume `:` and return `DIRECTIVE_START`; else call `advance_line()` and loop — lines 147-153 of current scanner
- [x] 1.4 Modify `\n` skip loop (Step 2): add `#` to the `while` condition that also checks `\n` and `\r`; in the `#` branch consume `#` with `advance(lexer, false)`, then if `lookahead == ':' && col == 0` leave `:` unconsumed (let Step 0c handle it on next scan); if `:` with col>0 call `advance_line()` (inside body comment); else call `advance_line()` — lines 194-211
- [x] 1.5 Add new Step 0c: dedicated `DIRECTIVE_START` handler inserted between Step 0b and Step 1; guard with `valid_symbols[DIRECTIVE_START]`; skip leading whitespace; if `#` found consume + check `:` → emit `DIRECTIVE_START`; if `:` found (no `#` — consumed by Step 2) consume `:` → emit DIRECTIVE_START; if plain `#` found `advance_line()` + return false; if no `#` or `:` fall through to Steps 1-4
- [x] 1.6 Verify scan() execution order: Step 0 (pending DEDENT) → Step 0b (BREAK) → **Step 0c (DIRECTIVE_START)** → Step 1 (skip inline whitespace) → Step 2 (`\n` processing) → Step 3 (EOF) → Step 4 (content fallthrough)

## Phase 2: Grammar — `grammar.js`

- [x] 2.1 Add `$._directive_start` to `externals` array (5th entry, after `$._break`)
- [x] 2.2 Modify `source_file` rule: replace `repeat(seq(optional($._break), $._rule))` with `repeat(choice($._directive, seq(optional($._break), $._rule)))` — matching design spec
- [x] 2.3 Add `_directive` rule (hidden, no CST wrapper): `choice($.import_directive, $.set_directive, $.kivy_directive)`
- [x] 2.4 Add `import_directive` rule: `seq($._directive_start, 'import', field('alias', $.identifier), field('module', $.directive_value), $._newline)`
- [x] 2.5 Add `set_directive` rule: `seq($._directive_start, 'set', field('name', $.identifier), field('value', $.directive_value), $._newline)`
- [x] 2.6 Add `kivy_directive` rule: `seq($._directive_start, 'kivy', field('version', $.directive_value), $._newline)`
- [x] 2.7 Add `directive_value` helper: `token.immediate(/[^\n\r]+/)`

## Phase 3: Test Corpus — `test/corpus/directives.txt`

- [x] 3.1 Write test: Single `#:import` directive
- [x] 3.2 Write test: Single `#:set` directive
- [x] 3.3 Write test: Single `#:kivy` directive
- [x] 3.4 Write test: Multiple directives in sequence
- [x] 3.5 Write test: Directives with blank lines between them
- [x] 3.6 Write test: Directive immediately followed by rule (no blank line)
- [x] 3.7 Write test: Directive followed by blank lines then rule
- [x] 3.8 Write test: File with only directives (zero rules)
- [x] 3.9 Write test: Malformed directive — unknown keyword (`#:unknown`)
- [x] 3.10 Write test: Malformed directive — `#:import` missing arguments
- [x] 3.11 Write test: Malformed directive — `#:set` missing name
- [x] 3.12 Write test: Plain `#` comment still works (backward compat)
- [x] 3.13 Write test: `#:` inside rule body — no crash, consumed as content

## Phase 4: Generate, Build, Test, Fix

- [x] 4.1 Run `tree-sitter generate` — no warnings or conflicts
- [x] 4.2 Run `tree-sitter build` — native compilation succeeds
- [x] 4.3 Run `tree-sitter test` — all 13 new directive tests pass
- [x] 4.4 Run `tree-sitter test` — all 24 existing core-syntax tests still pass (no regressions)
- [x] 4.5 Fix any failures: 3 fix iterations needed; final: 37/37 test pass, 100%
