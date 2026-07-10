## Exploration: Property Value Parsing

### Current State

The grammar at `grammar.js:138` defines `property_value` as:

```js
property_value: $ => token.immediate(/[^\n\r]+/),
```

This is a catch-all token that grabs everything after the colon until end of line. It produces a flat `(property_value)` node with no internal structure. The same pattern is used for `directive_value` at line 55.

The rule is used in two places:
- `property` (line 115-120) — `identifier: value`
- `event_binding` (line 122-128) — `on_event: handler`

A `string` rule already exists in the grammar (line 142-145) as `choice(/'[^']*'/, /"[^"]*"/)` but is **not** used inside `property_value` — it's only referenced by `id_declaration`.

All 28+ test cases involving property values show `value: (property_value)` with no child nodes, regardless of whether the value is `"Hello"`, `14`, `self.pos`, or `(1, 0, 0, 1)`.

### Key Constraint: `token.immediate`

The current rule uses `token.immediate()`, which prevents extras (spaces/tabs) from being skipped before the token starts. To add structured sub-rules, `property_value` must either:
- Keep all sub-rules as pure token-level regexes inside `token.immediate(choice(...))`, OR
- Remove `token.immediate` from the top level and make sub-rules normal (non-token) rules

The second approach is more flexible and supports complex sub-rules (sequences like `dotted_ref`, `tuple`). It's safe because `_newline` is not an extra and `optional($._newline)` guards the parent rule — a newline cannot be consumed as part of `property_value`.

### Affected Areas

- `grammar.js` — `property_value` rule and new sub-rules (`number`, `boolean`, `_none`, `dotted_ref`, `_raw_value`); integrate existing `string` rule; remove `token.immediate` from the top-level
- `test/corpus/core-syntax.txt` — ~6 existing tests showing `value: (property_value)` need S-expression updates; add ~10-15 new test cases for each value type
- `test/corpus/canvas.txt` — ~5 tests with `rgba: (1, 0, 0, 1)`, `pos: self.pos`, `size: self.size` need S-expression updates
- `openspec/specs/kvlang-core-syntax/spec.md` — "Declaration Lines" requirement and the `property captures full expression` scenario need a delta spec for structured values

### Approaches

1. **Light: Strings + numbers only** — Parse only strings (already have the rule) and numbers as structured nodes. Everything else (booleans, `None`, identifiers, dotted refs, tuples, lists, dicts, expressions) stays as flat `property_value`.
   - Pros: Minimal change (~15 lines in grammar.js), very low risk, all existing tests need only minor S-expression updates
   - Cons: Booleans, `None`, identifiers, and dotted refs remain flat — these are very common in real Kivy files and useful for highlighting/navigation
   - Effort: Low

2. **Medium: Primitives + references + tuples** — Parse strings, numbers, booleans, `None`, bare identifiers, dotted references (`self.parent.width`), and (optionally) parenthesized tuples `(1, 2, 3)`. Everything else (lists `[...]`, dicts `{...}`, arithmetic expressions, function calls) stays as a catch-all `_raw_value`.
   - Pros: Covers ~85%+ of real Kivy property value patterns at a glance; good balance of CST structure vs. complexity; dotted refs and tuples are extremely common in Kivy (colors, positions, references); no GLR blowup risk (all sub-rules are token-level or simple sequences)
   - Cons: Lists, dicts, and function calls remain flat; bare tuples `1, 2, 3` (used in `size_hint: 1, 1`) not parsed without expression-level comma handling
   - Effort: Medium

3. **Deep: Full structured CST** — Parse all value types including nested containers and arithmetic expressions: strings, numbers, booleans, `None`, identifiers, dotted refs, hex colors, parenthesized tuples, bare tuples, lists, dicts, function calls, and binary expressions with operator precedence.
   - Pros: Maximum CST structure enables rich tooling (structured editing, semantic highlighting, folding, symbol navigation)
   - Cons: **High risk of GLR exponential blowup** with deeply nested containers (list-in-dict-in-list); complex ambiguity resolution needed (parenthesized tuple vs. expression grouping, bare tuple vs. comma-separated values); significant test surface; could introduce fragility in error recovery
   - Effort: High

### Recommendation

**Medium approach** (approach 2).

The Medium approach gives the best structure-to-complexity ratio for a tree-sitter grammar. It covers the vast majority of property values in real Kivy files:
- `text: "Hello"` → `(string)`
- `font_size: 14` or `spacing: 0.5` → `(number)`
- `disabled: True` or `disabled: False` → `(boolean)`
- `on_press: None` → `(none)`
- `id: my_button` → `(identifier)` (already works for `id_declaration`, extends to properties)
- `pos: self.pos` or `size: self.parent.width` → `(dotted_ref)`
- `rgba: (1, 0, 0, 1)` → `(tuple)` with child `(number)` nodes
- `canvas: Clear` or `value: unexpected` → `(_raw_value)` catch-all

The work unit is well-scoped and won't exceed the 400-line PR budget. Deep parsing can be layered on top later by expanding individual sub-rules incrementally.

**Implementation sketch** for `grammar.js`:

```js
property_value: $ => choice(
  $.string,
  $.number,
  $.boolean,
  $._none,
  $.dotted_ref,
  $.tuple,
  $.identifier,
  $._raw_value,
),

_raw_value: $ => token.immediate(/[^\n\r]+/),

number: $ => token(choice(
  seq(optional('-'), /\d+/, optional('.', /\d+/)),  // 42, -1.5, 3.14
  seq(optional('-'), '.', /\d+/),                    // .5, -.5
)),

boolean: $ => token(choice('True', 'False')),
_none: $ => token('None'),

dotted_ref: $ => seq(
  $.identifier,
  '.',
  $.identifier,
  repeat(seq('.', $.identifier)),
),

tuple: $ => seq(
  '(',
  optional($._tuple_elements),
  optional(','),
  ')',
),
```

The catch-all `_raw_value` retains `token.immediate` to maintain backward compatibility and prevent edge cases where a newline appears before the value.

### Risks

- **Test churn**: All existing property-value tests need S-expression updates. ~11 tests in `core-syntax.txt` and ~5 in `canvas.txt` reference `(property_value)`. Each needs verification that the parser still produces valid trees.
- **`directive_value` alignment**: The same catch-all pattern is used for `directive_value` (line 55). It is NOT in scope for this change but future exploration should consider whether directives also benefit from structured values.
- **Tuple ambiguity**: `(1, 2, 3)` is common in Kivy for colors. But a bare `(unclosed` parenthesis would produce an ERROR that the current catch-all would gracefully handle. The `tuple` rule needs optional trailing comma and a closing `)` to handle edge cases gracefully.
- **Dotted ref vs. identifier ambiguity**: `self.pos` should be a `dotted_ref` but `pos` alone should be a bare `identifier`. The sequence rule handles this automatically since the `'.'` is required — a bare identifier matches `$.identifier` first.

### Ready for Proposal

Yes — the scope is well-understood, the Medium approach is clear, and there are no blockers. Proposal should define:
1. Which sub-rules to add (Medium set including tuples)
2. Whether to handle `directive_value` in the same change or defer
3. Delta to the `spec.md` for the "Declaration Lines" requirement
