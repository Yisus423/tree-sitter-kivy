# Proposal: `#:include` Directive Support

## Intent

Add parsing for Kivy's `#:include [force] <path>` directive — the only missing built-in directive in tree-sitter-kivy. Without it, valid `.kv` files using `#:include` produce ERROR nodes in the CST.

## Scope

### In Scope
- `include_directive` grammar rule in `grammar.js`
- Test cases in `test/corpus/directives.txt`
- Spec update in `openspec/specs/kvlang-directives/spec.md`

### Out of Scope
- `force` keyword as structured grammar field (stays in raw `directive_value`)
- Quoted path parsing (path is raw text to EOL)
- Scanner changes (existing `DIRECTIVE_START`/`NEWLINE` suffice)
- Runtime load/duplicate/force semantics (not a parsing concern)

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `kvlang-directives`: Add `#:include` directive — keyword followed by raw path to EOL, including optional `force` prefix in `directive_value`.

## Approach

Add `include_directive` rule following the existing pattern (`_directive_start` → keyword → `directive_value` → `_newline`), then add it to the `_directive` choice. Consistent with `#:kivy` — no structured `force` field. No scanner changes. This is Approach A from exploration (recommended).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `grammar.js` | Modified | Add `include_directive` rule (~3 lines) + add to `_directive` choice |
| `test/corpus/directives.txt` | Modified | Add 3 test cases: simple include, include with force, mixed with other directives |
| `openspec/specs/kvlang-directives/spec.md` | Modified | Add `#:include` requirement section |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Leading whitespace in path value | High | Document in spec; query authors must `.strip()`. Consistent with all existing directives. |
| GLR conflict from optional `force` | None | Avoided by Approach A (no structured `force` field) |

## Rollback Plan

`git revert` the commit adding `include_directive`. Existing directive parsing is untouched — purely additive change.

## Dependencies

None.

## Success Criteria

- [ ] `tree-sitter test` passes all existing + new directives tests
- [ ] All existing 177 directive corpus lines produce identical CST
- [ ] `#:include myfile.kv` produces `(include_directive path: (directive_value))`
- [ ] `#:include force myfile.kv` produces same node with `"force myfile.kv"` in `directive_value`
