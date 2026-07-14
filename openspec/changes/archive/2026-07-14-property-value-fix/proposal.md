# Proposal: Property Value Fix

## Intent

Two bugs in `grammar.js` break property value parsing for Python expressions. First, the `_raw_value` token is anonymous (prefixed with `_`) — invisible in the CST, uncapturable in queries, and hidden in the playground. Second, property values starting with `(` — like `(root.some_prop + other.prop)` — cause parse ERRORs because the `tuple` rule greedily matches `(root.some_prop` then fails when the closing `)` doesn't immediately follow.

## Scope

### In Scope
- Rename `_raw_value` → `raw_value` in grammar.js (make it a named, queryable node)
- Add catch-all `raw_value` alternative in `property_value` so `(`-starting expressions fall through to raw text instead of ERROR
- Update spec references from `_raw_value` to `raw_value`
- Run `tree-sitter test` to verify no regression

### Out of Scope
- Adding structured expression parsing for Python operators (`+`, `*`, etc.)
- Any scanner changes
- Other kvlang grammar features

## Capabilities

### New Capabilities
None — no new capabilities introduced.

### Modified Capabilities
- `kvlang-core-syntax`: The `_raw_value` node renames to `raw_value`. The Declaration Lines requirement table entry "font_size: self.parent.width * 0.5" must reference `raw_value` instead of `_raw_value`. This breaks none of the existing spec scenarios (the CST/query interface gains a named node, requirements stay identical).

## Approach

Two changes in `grammar.js`:

1. **Rename** `_raw_value` → `raw_value` everywhere (the rule definition and its single `optional()` reference in `property_value`).
2. **Restructure `property_value`** from a `seq()` to a `choice()`: first alternative keeps the original typed-value sequence (string, number, boolean, none, tuple, list, dict, dotted_ref, identifier) with optional `raw_value` suffix; second alternative is a bare `raw_value` catch-all that captures any expression no typed alternative matched (including `(`-starting Python expressions).

```javascript
property_value: $ => choice(
    seq(
      choice($.string, $.number, $.boolean, $._none,
             $.tuple, $.list_value, $.dict_value,
             $.dotted_ref, $.identifier),
      optional($.raw_value),
    ),
    $.raw_value,
  ),
```

Tree-sitter's GLR parser resolves the choice deterministically — the typed sequence is tried first, and if no prefix matches, the catch-all captures the whole line.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `grammar.js` | Modified | Rename `_raw_value`→`raw_value`, restructure `property_value` |
| `openspec/specs/kvlang-core-syntax/spec.md` | Modified | Update node name reference `_raw_value`→`raw_value` |
| `test/corpus/*` | None expected | Existing tests should continue passing |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| GLR ambiguity between typed-value seq and raw_value catch-all | Low | Tree-sitter tries alternatives in order; typed values always take precedence because they're more specific |
| Breakage in existing property_value scenarios | Low | Change is additive: typed alternatives still matched first, catch-all only triggers when nothing else matches |

## Rollback Plan

Revert the two grammar.js changes and the spec update in a single `git revert` commit. No data migration needed — this is purely a parse tree change.

## Dependencies

None.

## Success Criteria

- [ ] `tree-sitter test` passes with zero failures
- [ ] `font_size: self.parent.width * 0.5` parses without ERROR, produces `raw_value` node
- [ ] `size: (100, 200)` parses without ERROR, produces `tuple` node (not raw_value — typed match must win)
- [ ] `pos: (root.x + root.y)` parses without ERROR, produces `raw_value` node
- [ ] Query `(raw_value) @raw` captures the expected node
