# Proposal: Multiclass Class Rules in kvlang

## Intent

Kivy's kvlang supports `<Button, Label, TextInput>:` — multiple widget classes receiving the same rule block. The current grammar only handles a single entry inside `<>`. This limits corpus accuracy and prevents tree-sitter queries from targeting individual entries.

## Scope

### In Scope
- Grammar: extract `class_entry` rule, compose `class_rule` as comma-separated list of entries
- CST: named `class_entry` nodes wrapping each entry
- Tests: update ~10 existing CSTs, add ~6 new multiclass scenarios
- Parser: regenerate `grammar.json`, `node-types.json`, `parser.c`

### Out of Scope
- Trailing/leading comma support (explicitly rejected by Kivy)
- Negated entries in multiclass (`<A, -B>:` — not valid Kivy)
- Entry-type mixing enforcement (Kivy runtime constraint, not grammar-enforceable)
- Scanner changes (commas/diamond flow through internal lexer)

## Capabilities

### New Capabilities
None — this modifies existing core syntax; no new standalone spec needed.

### Modified Capabilities
- `kvlang-core-syntax`: `class_rule` requirement expands to support comma-separated `class_entry` list. Each entry is a standalone node — named, dynamic (`@Base`), or empty (`<>:`). Single-entry rules (including `<-Name>:`) remain valid.

## Approach

**Approach B** from exploration. Extract a named `class_entry` rule from the current inline entry logic. `class_rule` becomes two alternatives: (1) negated single entry (`<-Name>:`) and (2) one or more class entries separated by commas (`<A, B, C>:`). No scanner changes — commas inside `<>` are unambiguous and handled by the internal lexer.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `grammar.js` | Modified | `class_rule` split into `class_entry` + multiclass alternatives |
| `src/parser.c` | Generated | Regenerated via `tree-sitter generate` |
| `src/grammar.json` | Generated | Auto-updated |
| `src/node-types.json` | Generated | Auto-updated |
| `test/corpus/core-syntax.txt` | Modified | ~10 existing CSTs updated + ~6 new multiclass tests |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Existing test breakage (all ~10) | High | Mechanical CST wrapper update — wrap each entry in `class_entry` |
| Unused `class_entry` rule exported | Medium | Acceptable — named rules are query-targetable by design |
| `<>:` global form breaks | Low | Handled naturally — `class_entry` makes name/base optional |

## Rollback Plan

Revert `grammar.js` `class_rule` to original single-entry form. Delete regenerated parser files and re-run `tree-sitter generate`. Restore corpus tests via `git checkout test/corpus/core-syntax.txt`.

## Dependencies

None.

## Success Criteria

- [ ] `tree-sitter generate` produces no errors
- [ ] All corpus tests pass (existing updated + new multiclass scenarios)
- [ ] `<A, B>:` produces two `class_entry` children under `class_rule`
- [ ] `<A, B,>:` produces ERROR (trailing comma rejected)
- [ ] `<A, -B>:` produces ERROR (negated in multiclass rejected)
- [ ] `<-Button>:` single negated rules unchanged
- [ ] `<>:` global rule works unchanged
- [ ] `<A@Base1, B@Base2>:` each entry carries its own base field
