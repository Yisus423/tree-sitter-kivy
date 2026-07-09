# Tasks: Core Kvlang Grammar

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~700 (human-written: 120 scanner + 300 grammar + 250 tests + 30 config) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1: Scaffold+Scanner (~150) → PR 2: Grammar (~300) → PR 3: Tests (~250) |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Base | Notes |
|------|------|-----------|------|-------|
| 1 | Scaffold + `src/scanner.c` | PR 1 | main | ~150 lines; compiles independently after `tree-sitter init` |
| 2 | `grammar.js` with all rules | PR 2 | main | ~300 lines; generates parser, no tests yet |
| 3 | `test/corpus/core-syntax.txt` (24 tests) | PR 3 | main | ~250 lines; final verification `tree-sitter test` |

## Phase 1: Scaffold — `tree-sitter init`

- [x] 1.1 Create scaffold manually (tree-sitter init requires TTY; created grammar.js, tree-sitter.json, src/ manually)
- [x] 1.2 Review generated files — kept grammar.js, tree-sitter.json, src/parser.c, src/tree_sitter/*.h; no bindings dirs generated since we bypassed init
- [x] 1.3 Verify `tree-sitter generate` + `tree-sitter build` succeed on stub grammar (wasm build blocked by slow wasi-sdk download; native build succeeds)

## Phase 2: Scanner — `src/scanner.c`

- [x] 2.1 Write TokenType enum (NEWLINE, INDENT, DEDENT, BREAK) and Scanner struct (depth + indent_stack[32]) — in src/scanner.c
- [x] 2.2 Implement create/destroy/serialize/deserialize lifecycle with buffer safety — resets on corruption (count > MAX_INDENT_STACK or buffer too short)
- [x] 2.3 Implement scan() BREAK path: skip blank/comment lines between top-level rules — step 0 per design
- [x] 2.4 Implement scan() main path: skip whitespace → classify lines → tab-aware column tracking (PEP 8: tabs → next multiple of 8) — steps 1-2 per design
- [x] 2.5 Implement scan() EOF handling: emit NEWLINE/DEDENT per valid_symbols, return false when stack at indent level 0 — step 3 per design
- [x] 2.6 Implement scan() indent comparison: emit NEWLINE (col==stack), INDENT (col>stack), DEDENT (col<stack) — step 4 per design

## Phase 3: Grammar — `grammar.js`

- [x] 3.1 Write grammar skeleton: name `'kivy'`, extras `[/[ \t]/]`, externals (4 tokens)
- [x] 3.2 Write source_file → _rule → root_rule/class_rule hierarchy with optional _break
- [x] 3.3 Write _rule_body: choice(_newline, INDENT + repeat(_declaration) + DEDENT)
- [x] 3.4 Write property, event_binding, id_declaration, widget_declaration rules
- [x] 3.5 Write helpers: property_value (token.immediate), identifier, string

## Phase 4: Tests — `test/corpus/core-syntax.txt`

- [x] 4.1 Write tests 1–12: empty file, comment-only, root/class rules, properties, events, ID declarations, basic bodies
- [x] 4.2 Write tests 13–24: child/nested widgets, comments/blank lines in bodies, top-level blanks, tabs, indent edge cases

## Phase 5: Iterate — generate, build, test, fix

- [x] 5.1 Run `tree-sitter generate && tree-sitter build --wasm && tree-sitter test`
- [x] 5.2 Fix failures in grammar.js or scanner.c; re-generate and retest
- [x] 5.3 Repeat until all 24 tests pass
