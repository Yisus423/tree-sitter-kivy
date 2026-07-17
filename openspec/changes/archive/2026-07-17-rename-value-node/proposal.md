# Proposal: Rename `property_value` → `value`, Remove `event_statement`

## Intent

`property_value` is used as the inline value node for BOTH property declarations and event bindings. This is semantically wrong — events don't have "property" values. Additionally, `event_statement` is a duplicate of `property_value` (both use `token(/[^\n\r]+/)`), creating unnecessary grammar surface area without adding semantic value.

Rename to `value` (clear, generic, correct in both contexts) and replace `event_statement` with a hidden internal `_expression_line` rule to eliminate duplication.

## Scope

### In Scope
- Rename `property_value` → `value` in `grammar.js` and all references
- Add hidden `_expression_line` rule, remove `event_statement`
- Keep `event_body` as the CST-visible multiline container, using `_expression_line` internally
- Regenerate `src/parser.c` and `src/grammar.json` via `tree-sitter generate`
- Update `queries/highlights.scm`: remove `(event_statement) @embedded`, update `property_value` refs
- Update `queries/injections.scm`: change `property_value` → `value`
- Update `test/corpus/core-syntax.txt`: all `(property_value)` → `(value)`, all `(event_statement)` → removed from S-expressions
- Update `test/e2e/verify.mjs` if it references `property_value`

### Out of Scope
- No canvas block changes
- No `scanner.c` changes
- No multiline property values (Kivy does not support them)
- No query color/beauty improvements (deferred)
- No grammar structure comparison with Kivy docs

## Capabilities

### New Capabilities
None — no new capability is being introduced.

### Modified Capabilities
- `kvlang-core-syntax`: CST node names `property_value` → `value`, `event_statement` removed (absorbed into hidden `_expression_line`). All spec tables referencing these node names must be updated.
- `tree-sitter-queries`: Query files reference `property_value` and `event_statement` in highlights and injections. These must use the new names.

## Approach

1. In `grammar.js`: rename rule `property_value` → `value`, add hidden `_expression_line` with same token pattern, change `event_body` and `event_binding` to use `_expression_line` instead of `event_statement` / `property_value` respectively.
2. Run `tree-sitter generate` to rebuild parser.
3. Run test suite to confirm all corpus tests pass with updated S-expression expectations.
4. Update queries and e2e tests with the new node names.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `grammar.js` | Modified | Rename `property_value`, add `_expression_line`, remove `event_statement` |
| `src/parser.c` | Regenerated | Via `tree-sitter generate` |
| `src/grammar.json` | Regenerated | Via `tree-sitter generate` |
| `queries/highlights.scm` | Modified | Remove `(event_statement) @embedded`, update `property_value` refs |
| `queries/injections.scm` | Modified | `(property_value)` → `(value)` |
| `test/corpus/core-syntax.txt` | Modified | All S-expressions updated |
| `test/e2e/verify.mjs` | Possibly modified | Any `property_value` refs |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Forgetting to update an `event_statement` or `property_value` ref in queries | Low | Run `grep` for both tokens after changes; let CI catch mismatches |
| Corpus test mismatch after rename | Low | `tree-sitter test` catches all diffs immediately; update expectations file in lockstep |
| Downstream consumers relying on CST node names | Low | This is a rename with no semantic change; communicate via commit message |

## Rollback Plan

Revert the single commit that makes these changes. Since this is entirely mechanical (rename + regenerate), revert is clean — no data migration needed.

## Dependencies

- `tree-sitter` CLI (>= 0.22) for parser generation

## Success Criteria

- [ ] `tree-sitter test` passes with all corpus tests updated
- [ ] `tree-sitter parse` on sample `.kv` files produces `(value)` instead of `(property_value)` and no `(event_statement)` in output
- [ ] `grep -r 'property_value\|event_statement' grammar.js queries/ test/` returns zero matches
- [ ] `grep -r '_expression_line' grammar.js` confirms hidden rule exists (not queryable)
