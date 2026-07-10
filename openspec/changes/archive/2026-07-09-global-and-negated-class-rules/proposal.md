# Proposal: Global and Negated Class Rules

## Intent

Add support for two Kivy kvlang grammar features currently missing from tree-sitter-kivy: `<>:` (global rule — applies to all widget classes) and `<-Name>:` (negated rule — applies to all widgets except Name). Both are standard Kivy features that the current parser rejects as syntax errors.

## Scope

### In Scope
- Grammar: extend `class_rule` production with `choice()` for global/negated/standard forms
- Tests: corpus test cases for `<>:`, `<-Name>:`, both with and without rule bodies
- Spec: update Rule Headers requirement in `kvlang-core-syntax` spec

### Out of Scope
- Negation with dynamic base (`<-Name@Base>:`) — invalid in Kivy, naturally rejected by grammar
- Multiple negated names (`<-Name1+Name2>:`) — not valid in Kivy
- Scanner changes — not needed (`-` handled by internal lexer)

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `kvlang-core-syntax`: Rule Headers requirement extends to accept global rules (`<>:`) and negated class rules (`<-Name>:`)

## Approach

Extend `class_rule` in `grammar.js` by wrapping angle-bracket content in `choice(...)`:

- **Branch 1** (`<-Name>`): `seq('-', field('negated', $.identifier))`
- **Branch 2** (`<Name>`, `<Name@Base>`, `<>`): existing pattern wrapped in `seq(optional(field('name', $.identifier)), optional(seq('@', ...)))`

A `choice()` with left-to-right priority naturally rejects `<-Name@Base>:` (Branch 1 partially matches `-Name`, then `>` expected but `@` found → ERROR). Fully backward compatible — existing CST trees are identical.

No scanner changes. No new named rule types.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `grammar.js` | Modified | ~5 lines in `class_rule` production |
| `test/corpus/core-syntax.txt` | Modified | 4+ new test cases |
| `openspec/specs/kvlang-core-syntax/spec.md` | Modified | Update Rule Headers requirement |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Regression on existing `<Name>:` or `<Name@Base>:` parses | Low | Branch 2 preserves existing pattern; all existing tests must pass |
| GLR ambiguity between branches | None | Branch 1 starts with literal `-`, Branch 2 with optional identifier — no overlap |

## Rollback Plan

Revert `grammar.js` to previous `class_rule` definition. No data migration — grammar-only change.

## Dependencies

None.

## Success Criteria

- [ ] All existing corpus and unit tests pass
- [ ] New corpus tests for `<>:`, `<-Name>:`, `<>:` with body, `<-Name>:` with body produce correct CST trees
- [ ] `<-Name@Base>:` produces ERROR node as expected
