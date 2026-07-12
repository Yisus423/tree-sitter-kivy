# Design: Multiclass Class Rules in kvlang

## Technical Approach

Extract `class_entry` as a named rule from the current inline entry logic in `class_rule`. Restructure `class_rule` into a `choice()` between two branches inside `<>`: a negated single-entry form (`<-Name>`) and a sequence of one or more `class_entry` nodes (single or comma-separated). Per spec delta for `kvlang-core-syntax` — no scanner changes, commas inside `<>` are unambiguous.

## Architecture Decisions

| Decision | Options | Tradeoffs | Choice |
|----------|---------|-----------|--------|
| `class_entry` fields | All name+base as current vs stripped-down | All fields needed — each multiclass entry can be dynamic | Expose `name` (optional) and `base` (optional, repeatable `+`-separated) |
| `class_rule` structure | Three-way choice: negated, multiclass (comma-repeat), single | Multiclass and single share the same entry production — `repeat(seq(',', class_entry))` naturally handles both: zero repetitions = single, one or more = multiclass | Two-way choice: negated branch + class_entry-with-repeat branch |
| Trailing comma handling | Grammar rejects vs explicit error production | `repeat(...)` naturally fails when `, >` appears (no class_entry matches) → ERROR with no extra code | Implicit rejection via `repeat()` after last class_entry |
| `<>:` global form | Drops to `class_entry` with both name+base absent | Produces `(class_rule (class_entry))` — no fields, same semantics | Handled naturally — both `name` and `base` are optional |

## Grammar Changes

```javascript
// NEW — named rule wrapping each non-negated entry
class_entry: $ => seq(
  field('name', optional($.identifier)),
  optional(seq('@', field('base', $.identifier),
    repeat(seq('+', field('base', $.identifier))))),
),

// MODIFIED — choice between negated and entry list
class_rule: $ => seq(
  '<',
  choice(
    seq('-', field('negated', $.identifier)),     // <-Name>
    seq(                                           // <A> or <A, B>
      $.class_entry,
      repeat(seq(',', $.class_entry)),
    ),
  ),
  '>',
  ':',
  optional($._rule_body),
),
```

The `repeat(seq(',', $.class_entry))` elegantly covers both single-entry (`<Name>:`, `<>:`) and multiclass (`<A, B>:`). Trailing commas fail because `>` is not a valid class_entry start.

## Conflict Analysis

| Concern | Analysis |
|---------|----------|
| Comma inside `<>` vs commas in values | No overlap — `_tuple_elements`, `_list_elements`, `_dict_entries` only appear inside `()`, `[]`, `{}`. The `<`/`>` tokens isolate the class-rule context. |
| New conflicts introduced | **None**. The internal lexer handles `<`, `>`, and `,` as single-character tokens — no ambiguity with identifier-based productions. |

No changes to the `conflicts` declaration needed.

## Test Plan

### Updated existing CSTs (7 tests)
Each non-negated class rule CST gets wrapped in `class_entry`:

| Test Name | Current CST | New CST |
|-----------|-------------|---------|
| Class rule | `(class_rule name: (identifier))` | `(class_rule (class_entry name: (identifier)))` |
| Blank lines between rules | `(class_rule name: ...)` ×2 | wrapped ×2 |
| Dynamic — single base | `(class_rule name: ... base: ...)` | wrapped |
| Dynamic — multiple bases | same pattern | wrapped |
| Dynamic — missing name (ERROR) | `(class_rule base: (identifier))` | `(class_rule (class_entry base: (identifier)))` |
| Global — no body | `(class_rule)` | `(class_rule (class_entry))` |
| Global — with body | `(class_rule (property ...))` | `(class_rule (class_entry) (property ...))` |

### Unchanged tests (3)
Negated and error tests need no changes: `<-Button>:`, `<-Button>:` with body, `<-Name@Base>:` (ERROR).

### New multiclass tests (6)
- `<A, B>:` — two class_entry children
- `<A, B, C>:` — three class_entry children
- `<Custom@Button, Icon@Label>:` — dynamic entries with bases
- `<A, B>:` with body — declarations inside multiclass
- `<A, B, >:` — trailing comma → ERROR
- `<A, -B>:` — negated within multiclass → ERROR

## File Changes

| File | Action |
|------|--------|
| `grammar.js` | Modify — add `class_entry` rule; restructure `class_rule` |
| `src/grammar.json` | Generate — run `tree-sitter generate` |
| `src/node-types.json` | Generate — run `tree-sitter generate` |
| `src/parser.c` | Generate — run `tree-sitter generate` |
| `test/corpus/core-syntax.txt` | Modify — update 7 CSTs, add 6 new tests |

## Regeneration

After `grammar.js` changes: `tree-sitter generate` produces updated `src/parser.c`, `src/grammar.json`, `src/node-types.json`. Run `tree-sitter test` to validate all corpus tests pass.

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Open Questions

None.
