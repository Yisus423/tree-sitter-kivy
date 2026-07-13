# Proposal: Template Rules for kvlang

## Intent

Template rules (`[Name]:`, `[Name@Base]:`) exist in real-world Kivy .kv files but are currently unparseable, producing ERROR nodes. This prevents tooling (syntax highlighting, linting, query-based analysis) from handling valid Kivy files. Template rules share the same structural pattern as class rules — a bracketed header with optional dynamic bases, followed by a full rule body.

## Scope

### In Scope
- `template_rule` node supporting `[Name]:`, `[Name@Base]:`, `[Name@Base1+Base2]:` syntax
- Full rule body (properties, bindings, canvas, child widgets) — same as `class_rule`
- Queryable `template_rule` node in the CST
- Corpus test file covering template rule scenarios

### Out of Scope
- `[@Base]:` without name (not requested, additive later)
- Validation beyond structure (Kivy runtime constraints, not grammar concern)
- Scanner changes — `[]` are single-line tokens, handled entirely in grammar.js

## Capabilities

### New Capabilities
- `template-rules`: Kvlang syntax for template rule headers with optional base classes (`[Name]:`, `[Name@Base1+Base2]:`) and full rule body support

### Modified Capabilities
None — entirely additive; no existing spec requirements change.

## Approach

Add `$.template_rule` to the `_rule` choice in grammar.js alongside `root_rule` and `class_rule`. The `template_rule` definition mirrors `class_rule`'s structure but uses `[...]:` delimiters. Reuses the `class_entry`-like name/@base pattern for content inside brackets. No scanner changes since `[` and `]` never interact with INDENT/DEDENT tracking — they're single-line tokens consumed entirely in grammar.js. After changing grammar.js, run `tree-sitter generate` to produce updated `src/parser.c`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `grammar.js` | Modified | Add `template_rule` definition, add to `_rule` choice |
| `src/parser.c` | Modified | Regenerated via `tree-sitter generate` |
| `test/corpus/template_rules.txt` | New | Test: `[Name]:`, `[Name@Base]:`, `[Name@B1+B2]:`, body scenarios |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `[]` conflict with `list_value` | Low | `list_value` only appears in property values; template rules at level 0 — different syntactic positions |
| Unexpected indent after `]:` | Low | Same `_rule_body` logic as `class_rule` handles INDENT/DEDENT uniformly |

## Rollback Plan

1. Remove `template_rule` from `_rule` choice in grammar.js
2. Delete the `template_rule` production rule
3. Run `tree-sitter generate` to restore `src/parser.c`

## Dependencies

None.

## Success Criteria

- [ ] `[Name]:`, `[Name@Base]:`, `[Name@Base1+Base2]:` at level 0 parse as `template_rule` nodes (queryable)
- [ ] Template rules with body (indented properties, children) parse without ERROR
- [ ] All existing corpus tests still pass
- [ ] No ERROR nodes for valid template rule syntax
