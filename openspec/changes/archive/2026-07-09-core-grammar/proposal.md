# Proposal: Core Kvlang Grammar

## Intent

Create the first functional tree-sitter grammar for kvlang (.kv files). The project is a blank scaffold — no grammar.js, no parser, no tests exist. This change builds the core syntax foundation: widget declarations, property assignments, event bindings, id declarations, root rules, and class rules with indentation-aware block structure via an external C scanner.

## Scope

### In Scope
- Root rules and class rules (`<ClassName>:`)
- Widget declarations (header line + indented body)
- Property assignments (`key: python_expression`)
- Event bindings (`on_event: python_statement`)
- ID declarations (`id: identifier`)
- External scanner for INDENT/DEDENT/NEWLINE tokens
- Corpus tests for all in-scope constructs

### Out of Scope
- Canvas blocks (`canvas.`, `canvas.before`, `canvas.after`)
- Templates (`[]` syntax) and dynamic classes (`<New@Base>:`)
- `#:import`, `#:set`, `#:kivy` directives
- Multi-class rules (`<A,B>:`)
- Python expression parsing (values captured as raw text)
- Syntax highlighting queries (`queries/`)

## Capabilities

### New Capabilities
- `kvlang-core-syntax`: Core kvlang grammar — widget declarations, properties, event bindings, id declarations, and indentation-based block structure via external scanner.

### Modified Capabilities
None — first capability, no existing specs to modify.

## Approach

1. Run `tree-sitter init` to scaffold project structure (tree-sitter.json, grammar.js, src/, test/corpus/)
2. Write `src/scanner.c` — minimal external scanner: INDENT/DEDENT/NEWLINE tokens with indent stack (~100-150 lines C)
3. Write `grammar.js` — rules for root/class rules, widget headers, properties, event bindings, id declarations (~200-300 lines grammar DSL)
4. Write corpus tests in `test/corpus/core-syntax.txt`
5. Iterate: `tree-sitter generate` → `tree-sitter build --wasm` → `tree-sitter test` until all pass

Follows tree-sitter-python's pattern (minimal scanner + full grammar rules) rather than YAML's full-external-lexer approach.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `grammar.js` | New | Core grammar rules — widget declarations, properties, events |
| `src/scanner.c` | New | Minimal C scanner for INDENT/DEDENT/NEWLINE |
| `test/corpus/core-syntax.txt` | New | Corpus tests for all in-scope constructs |
| `tree-sitter.json` | Modified | Created/updated by `tree-sitter init` |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `tree-sitter init` overwrites package.json | Low-Medium | Git diff to review; keep only what's needed |
| C scanner bugs cause parser crashes | Medium | Start simple, test incrementally, reference Python scanner |
| Indentation edge cases (tabs, mixed spaces) | Low | Normalize tabs to 8 spaces; document constraint |

## Rollback Plan

`git revert` the change commit. If `tree-sitter init` modified package.json or other existing files, revert restores originals. If partial rollback needed, manually restore files from git HEAD.

## Dependencies

- `tree-sitter init` — blocking prerequisite. Must run before any grammar work.

## Success Criteria

- [ ] `tree-sitter test` passes for all corpus tests
- [ ] All in-scope kvlang constructs parse to expected CST structures
