# Design: Remove Type-Checking Antipattern from Property Values

## Context

Kivy's kvlang embeds Python expressions as property values. The grammar was trying to
categorize these at parse time into typed child nodes: `string`, `number`, `boolean`,
`_none`, `tuple`, `list_value`, `dict_value`, `dotted_ref`, `identifier`, plus a
`raw_value` catch-all for `(`-starting expressions and a hidden `_raw_value` suffix
for whatever didn't match.

## Problem

This approach had multiple issues:

1. **Type checking at the grammar level**: `_typed_value` was used inside tuples, lists,
   and dicts to restrict which value types could appear — actively excluding `raw_value`
   (parenthesized expressions). This made tree-sitter enforce semantic rules that belong
   in a type checker, not a parser.

2. **Double parsing**: `injections.scm` already injects Python into `property_value` with
   `include-children`. The Kivy grammar would parse `"hello"` as `(string)`, and then
   tree-sitter-python would parse the same text again — two parsers competing over the
   same bytes.

3. **Fragile regex for Python expressions**: `_paren_token` used
   `token(seq('(', /[^,)\n\r]+/, ')'))` to match parenthesized expressions, which fails
   on nested parens, commas inside parens, or parens in strings.

4. **Hidden suffix hack**: `optional($._raw_value)` at the end of `property_value` would
   grab whatever text the typed alternatives didn't match — an admission that the grammar
   doesn't understand the full syntax.

5. **Conflicts from artificial ambiguity**: GLR conflicts declared for `_tuple_elements`,
   `_list_elements`, and `_dict_entries` existed because the typed sub-rules inside
   containers created synthetic ambiguity.

## Solution

Flattened `property_value` to a single catch-all token:

```javascript
property_value: $ => token(/[^\n\r]+/),
```

## What Was Removed

15 rules removed from `grammar.js`:

| Rule | Reason |
|------|--------|
| `number` | Only used inside property_value |
| `boolean` | Only used inside property_value |
| `_none` | Only used inside property_value |
| `dotted_ref` | Only used inside property_value |
| `_typed_value` | Type discrimination set — core antipattern |
| `_tuple_elements` | Only used inside `tuple` |
| `_list_elements` | Only used inside `list_value` |
| `_dict_entry` | Only used inside `dict_value` |
| `_dict_entries` | Only used inside `dict_value` |
| `tuple` | Only used inside property_value |
| `list_value` | Only used inside property_value |
| `dict_value` | Only used inside property_value |
| `raw_value` | Only used inside property_value |
| `_paren_token` | Only used by `raw_value` |
| `_raw_value` | Only used by `property_value` |

Also removed the `conflicts` array (3 entries referencing `_tuple_elements`,
`_list_elements`, `_dict_entries`).

## What Stayed

- `string` — still used in `id_declaration`
- `identifier` — used throughout for rule names, class entries, widget names, etc.
- `comment` — unchanged
- All structural rules (source_file, root_rule, class_rule, template_rule,
  widget_declaration, property, event_binding, etc.)

## Why Not a Hybrid Approach

An intermediate solution would have been to add `raw_value` to `_typed_value`, keeping
typed sub-rules while removing the discrimination. This was rejected because:

- The fragile `_paren_token` regex would remain
- The hidden `_raw_value` suffix would remain
- The conflict declarations would remain
- Double parsing (Kivy + Python injection) would continue
- The grammar would still pretend to understand Python expressions

Since the project has no production consumers yet and already has Python injection
configured, the radical approach was viable and left no residual debt.

## Impact on Queries

| Query file | Changes |
|---|---|
| `highlights.scm` | Removed `@number`, `@boolean`, `["None"]`, `@variable.member` from `dotted_ref`, `@variable` from `identifier` inside property_value. `(string) @string` kept for `id_declaration`. `["(" ")"]` removed since `(`/`)`/`{`/`}` are no longer anonymous tokens in grammar. |
| `locals.scm` | Removed `@local.reference` captures for event handlers (`on_press: root.do_it`). These can be recovered later via Python injection queries. |
| `injections.scm` | Unchanged — already injects Python into `property_value`. Works better now since there are no competing child nodes. |
| `tags.scm` | Unchanged — doesn't reference property_value internals. |

## Impact on Tests

- 108 corpus tests pass (2 error-recovery tests updated to match new parser behavior
  without `string`/`number` fallback tokens in ERROR regions)
- 61 e2e tests pass (captures removed for `@number`, `@boolean`, `@variable.member`,
  `@string` inside property_value; injection tests unchanged)
