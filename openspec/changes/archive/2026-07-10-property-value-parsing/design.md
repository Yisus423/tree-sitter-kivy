# Design: Property Value Parsing

## Technical Approach

Rewrite `property_value` from a flat `token.immediate` catch-all into a `choice()` of 7 typed sub-rules + `_raw_value` fallback. Each sub-rule uses the appropriate `token()`/`seq()` strategy. Remove `token.immediate` from the top-level to allow spaces before values; apply it only to `_raw_value` for newline safety. All sub-rules produce ≥1 character, avoiding GLR infinite loops.

Target grammar.js structure (replaces line 138-139):

```js
property_value: $ => choice(
  $.string,
  $.number,
  $.boolean,
  $._none,
  $.tuple,
  $.dotted_ref,
  $.identifier,
  $._raw_value,
),
```

## Architecture Decisions

### Token Type Strategy

| Sub-rule | Construct | Rationale |
|----------|-----------|-----------|
| `number` | `token(seq(optional('-'), choice(…)))` | Atomic value — single lexeme |
| `boolean` | `token(choice('True', 'False'))` | Keywords — atomic |
| `_none` | `token('None')` | Keyword — atomic, private |
| `string` | `choice(/'[^']*'/, /"[^"]*"/)` | Already exists — regex token |
| `identifier` | `/[a-zA-Z_]\w*/` | Already exists — regex token |
| `dotted_ref` | `seq($.identifier, '.', $.identifier, repeat(…))` | Compound — multiple tokens |
| `tuple` | `seq('(', optional(…), optional(','), ')')` | Compound — parens + elements |
| `_raw_value` | `token.immediate(/[^\n\r]+/)` | Catch-all — must stay on same line |

### Choice Ordering

1. `string` — starts with `"` or `'` (unambiguous)
2. `number` — starts with digit or `-` (unambiguous vs identifier)
3. `boolean` — `True`/`False` (would match `identifier` — must precede it)
4. `_none` — `None` (same reason)
5. `tuple` — starts with `(` (unambiguous)
6. `dotted_ref` — starts with identifier + `.` (must precede bare `identifier`)
7. `identifier` — bare word
8. `_raw_value` — catch-all

### `token.immediate` Removal

The current top-level `token.immediate` prevents whitespace between `:` and value. Removing it aligns with real Kivy syntax where `text:  "Hello"` (extra space) is valid. `_raw_value` retains `token.immediate` to prevent newline consumption.

### Tuple Structure

```
tuple:          seq('(', optional(_tuple_elements), optional(','), ')')
_tuple_elements: seq(property_value, repeat(',', property_value))
```

Elements are recursive `property_value` calls — supports tuples of any value type. `optional(',')` handles trailing commas: `(1,)` vs `(1)`. Empty tuple `()` is valid.

### Dotted Reference Minimum

Requires ≥2 identifiers separated by `.` (e.g., `self.pos`). Enforced by seq: `$.identifier + '.' + $.identifier` is mandatory before `repeat()`. Bare `self` falls through to `identifier`.

### Error Recovery

`_raw_value` captures unmatched patterns (arithmetic: `self.parent.width * 0.5`, calls: `print("clicked")`). No regression on previously-valid Kivy files — all property values continue to parse without ERROR nodes.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `grammar.js:138` | Modify | Replace `property_value` `token.immediate` with `choice()` of sub-rules |
| `grammar.js:147+` | Add | Insert `number`, `boolean`, `_none`, `dotted_ref`, `_tuple_elements`, `tuple`, `_raw_value` |
| `test/corpus/core-syntax.txt` | Modify | Update ~6 existing `(property_value)` to typed nodes; add ~10 new test blocks |
| `test/corpus/canvas.txt` | Modify | Update ~5 existing `(property_value)` to typed nodes |

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Corpus | Each value type | Test block per type (string, number int/float/neg, boolean, None, identifier, dotted_ref, tuple variants, raw_value) |
| Corpus | Edge cases | Empty tuple, trailing-comma tuple, single-ident dotted ref (falls to identifier), leading whitespace |
| Corpus | Regression | All existing tests pass with updated S-expressions; `npx tree-sitter generate` succeeds |

## Migration / Rollout

No migration required. Grammar and tests change atomically.
