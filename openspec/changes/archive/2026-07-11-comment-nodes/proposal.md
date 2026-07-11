# Proposal: Comment Nodes

## Intent

Add `(comment)` CST nodes to the parser. Currently, `#` lines are consumed entirely by the external scanner for indent tracking, losing comment content from the CST. Editor tooling (nvim-treesitter, Helix) and custom devtools need `(comment)` nodes for syntax highlighting, folding, and structured navigation.

## Scope

### In Scope
- Own-line `#` comments at any indent level → `(comment)` node
- `#:` at col > 0 (inside rule body) → `(comment)` node (not a directive)
- Scanner changes at 3 sites to stop consuming `#` lines
- Grammar rule + extras: `comment: $ => token(seq('#', /[^\n]*/))` in extras
- Corpus test updates for all affected test cases (~6 tests across 2 files)
- Delta specs for `kvlang-core-syntax` and `kvlang-directives`

### Out of Scope
- Inline comments after code on same line (Kivy doesn't support them)
- Directive handling (`#:` at col 0 → DIRECTIVE_START, unchanged)
- Highlight queries for comments
- `#` at col 0 consumed during directive probing (accepted loss)

## Capabilities

### New Capabilities
None — comment nodes extend existing capabilities, not a new spec.

### Modified Capabilities
- `kvlang-core-syntax`: Comments and Blank Lines requirement — expected CST changes from "consumed as tokens" to `(comment)` nodes under source_file and inside rule bodies
- `kvlang-directives`: Comment Preservation requirement — changes from "no COMMENT nodes" to `(comment)` nodes for plain `#` comments

## Approach

1. **grammar.js**: Add `comment` rule and register as extra token
2. **src/scanner.c**: At 3 sites (Step 2 skip loop, Step 0b BREAK, Step 0c DIRECTIVE_START), stop consuming `#` and return false — DFA matches `comment` as extra
3. **Corpus tests**: Update expected S-expressions in 4+ core-syntax tests and 1 directives test to include `(comment)` nodes
4. **Delta specs**: Update kvlang-core-syntax and kvlang-directives requirement tables

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `grammar.js` | Modified | Add `comment` rule + extras entry |
| `src/scanner.c` | Modified | Stop consuming `#` at 3 sites |
| `test/corpus/core-syntax.txt` | Modified | Add `(comment)` to ~5 expected trees |
| `test/corpus/directives.txt` | Modified | Update "Plain # comment" and "#: at col >0" trees |
| `openspec/specs/kvlang-core-syntax/spec.md` | Modified | Comments requirement updated |
| `openspec/specs/kvlang-directives/spec.md` | Modified | Comment Preservation updated |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Scanner INDENT/DEDENT regression from skipping `#` | Low | All existing corpus tests must pass (sans comment node additions) |
| `#:` at col 0 loses `(comment)` when directive check consumes `#` | Low | Accepted — `#` at directive-valid col 0 without `#:` is rare |

## Rollback Plan

Revert grammar.js (comment rule + extras), revert scanner.c changes, revert corpus expected trees, revert delta specs.

## Dependencies

None.

## Success Criteria

- [ ] `tree-sitter test` passes all 3 corpus files
- [ ] `# comment` lines produce `(comment)` node in CST
- [ ] `#:` at col 0 still produces DIRECTIVE_START (unchanged)
- [ ] `#:` at col > 0 inside rule body produces `(comment)` node
- [ ] Existing non-comment test trees are identical (no behavioral regression)
