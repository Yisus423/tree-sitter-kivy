# Exploration: tree-sitter-queries

> Created: 2026-07-13
> Context: tree-sitter-kivy grammar is complete; query files for highlights, locals, and tags are now needed.

## Current State

The tree-sitter-kivy grammar is fully implemented with all features (directives, root/class/template rules, widget declarations, properties, event bindings, id declarations, canvas blocks, compound values, comments). The `tree-sitter.json` already references `queries/highlights.scm` as the highlights path, but **no query files exist yet** — the `queries/` directory itself is absent.

The grammar produces 23 named node types plus 21 anonymous/literal tokens (punctuation, keywords, operators). All names in the grammar are `identifier` tokens — the semantic meaning comes from the parent node context (property name vs widget name vs class name etc.), not from separate token types.

## Reference Analysis

I examined reference query files from:

- **JavaScript** (`@opentui/core/assets/javascript/highlights.scm`) — official nvim-treesitter, shows flat `@keyword` grouping
- **TypeScript** (`@opentui/core/assets/typescript/highlights.scm`) — extended grouping with `@keyword.conditional`, `@keyword.import`, etc.
- **Python locals.scm** — shows `@local.scope`, `@local.definition.*`, `@local.reference` patterns and `#set!` scope directives
- **Python tags.scm** (tree-sitter official) — shows `@name` + `@definition.class` / `@reference.call` convention

Key findings:
1. **highlights.scm** uses Neovim-standard capture names (`@keyword`, `@string`, `@type`, `@function`, `@property`, `@variable`, `@comment`, `@number`, `@boolean`, `@operator`, `@punctuation.*`). More specific captures (e.g., `@keyword.import`) are preferred when they add semantic value.
2. **locals.scm** uses `@local.scope` for scope boundaries and `@local.definition.*` / `@local.reference` for definition/reference tracking. The `#set!` directive sets scope visibility (e.g., `(#set! definition.type.scope "parent")`).
3. **tags.scm** uses `@name` for the symbol name node and `@definition.*` / `@reference.*` on the parent node. This is the convention for `tree-sitter tags` CLI and LSP document symbols.
4. `_raw_value` (trailing raw text after typed values) is a hidden node (`_` prefix) — it does NOT appear in the CST and CANNOT be queried.

## Affected Areas

| Path | Why |
|------|-----|
| `queries/highlights.scm` | **New file** — syntax highlighting for .kv files |
| `queries/locals.scm` | **New file** — scope tracking and definition/reference detection |
| `queries/tags.scm` | **New file** — document symbol navigation (LSP/tree-sitter tags) |
| `tree-sitter.json` | Already references `queries/highlights.scm`; may need updates to add `locals` and `tags` entries |

## Approaches

### Approach 1: Minimal — just highlights.scm

Only create `highlights.scm` with flat keyword grouping. Skip locals and tags.

- **Pros**: Smallest surface area, lowest maintenance
- **Cons**: No scope tracking, no LSP symbol support, poor editor experience
- **Effort**: Low

### Approach 2: Standard — all three files, Neovim conventions (RECOMMENDED)

Create all three query files using Neovim-standard capture groups (`@keyword`, `@type`, `@function`, `@property`, `@variable`, `@comment`, `@string`, `@number`, `@boolean`, `@operator`, `@punctuation.*`, `@local.*`, `@name` + `@definition.*`).

- **Pros**: Full editor integration; most widely supported across editors (Neovim, Helix, Zed); follows reference grammar patterns
- **Cons**: More query files to maintain
- **Effort**: Medium

### Approach 3: Aggressive — extended highlights with predicates

Same as Approach 2 but adds predicates (`#any-of?`, `#match?`) for special cases like capitalised type names, builtin variables (`self`, `root`, `app`), etc.

- **Pros**: Finer-grained highlighting for edge cases
- **Cons**: Predicates are engine-specific (lua in Neovim, scheme in others); less portable; higher volume
- **Effort**: Medium-High

## Recommendation

**Approach 2**. The user explicitly chose Neovim standard highlight groups and full coverage of all three query files. Approach 3 can be layered later if specific predicate-based refinements are needed. Approach 1 is insufficient for the stated goal.

## Highlight Group Mapping (Detailed)

### `highlights.scm` — Per-node mapping

| Node Type / Token | Capture | Rationale |
|---|---|---|
| `comment` | `@comment @spell` | Standard across all grammars |
| `string` | `@string` | Standard |
| `number` | `@number` | Standard |
| `boolean` | `@boolean` | Standard |
| `None` | `@constant.builtin` | Follows JS/Python convention for null-like values |
| `(property name: (identifier))` | `@property` | These are Kivy property keys (text, font_size, pos, etc.) |
| `(widget_declaration name: (identifier))` | `@type` | Widget class names (Button, Label, BoxLayout) |
| `(canvas_instruction name: (identifier))` | `@type` | Canvas instruction class names (Color, Rectangle, etc.) |
| `(root_rule name: (identifier))` | `@type` | Root widget type |
| `(class_entry name: (identifier))` | `@type.definition` | Defines a new dynamic widget class |
| `(class_entry base: (identifier))` | `@type` | References a base class |
| `(template_entry name: (identifier))` | `@type.definition` | Defines a new template |
| `(template_entry base: (identifier))` | `@type` | References a base class |
| `(class_rule negated: (identifier))` | `@type` | Negated widget class reference |
| `(import_directive alias: (identifier))` | `@module` | Import alias |
| `(import_directive module: (directive_value))` | `@string.special.path` | Module path string |
| `(set_directive name: (identifier))` | `@constant` | `#:set` variable definition |
| `(set_directive value: (directive_value))` | `@string.special` | Set value |
| `(include_directive path: (directive_value))` | `@string.special.path` | Include path |
| `(kivy_directive version: (directive_value))` | `@string.special` | Kivy version string |
| `(id_declaration name: (identifier))` | `@variable` | The assigned id name |
| `(id_declaration name: (string))` | `@string` | Quoted id |
| `(event_binding event: (event_name))` | `@attribute` | Event names are `on_<event>` — treated as attributes |
| `(event_binding handler: (property_value (identifier)))` | `@function` | Handler function reference |
| `(event_binding handler: (property_value (dotted_ref)))` | `@function.method` | Dotted handler reference |
| `(property value: (property_value (dotted_ref)))` | `@variable.member` | Property value dotted reference |
| `(property value: (property_value (identifier)))` | `@variable` | Property value identifier reference |
| `(canvas_block name: "canvas")` | `@keyword` | Canvas block keyword |
| `(canvas_block name: "canvas.before")` | `@keyword` | Canvas block keyword |
| `(canvas_block name: "canvas.after")` | `@keyword` | Canvas block keyword |
| `dotted_ref` (general fallback) | `@variable.member` | Any dotted reference |
| `identifier` (catch-all) | `@variable` | Generic identifier |
| `directive_value` | N/A (content captured by children) | — |

### Punctuation & Operator mapping

| Token | Capture | Context |
|---|---|---|
| `:` | `@punctuation.delimiter` | Colons everywhere (rules, properties, events, etc.) |
| `,` | `@punctuation.delimiter` | List/tuple/dict/multiclass separators |
| `.` | `@punctuation.delimiter` | Dotted references (inside `dotted_ref` token) |
| `(` `)` | `@punctuation.bracket` | Tuple delimiters |
| `[` `]` | `@punctuation.bracket` | List and template rule delimiters |
| `{` `}` | `@punctuation.bracket` | Dict delimiters |
| `<` `>` | `@punctuation.bracket` | Class rule delimiters |
| `@` | `@operator` | Inheritance operator |
| `+` | `@operator` | Multiple inheritance operator |
| `-` | `@operator` | Negation operator in class rules |
| `id` | `@keyword` | `id:` declaration keyword |

### Keyword mapping

| Token | Capture |
|---|---|
| `import` | `@keyword.import` |
| `include` | `@keyword.import` |
| `set` | `@keyword` |
| `kivy` | `@keyword` |

### `locals.scm` — Scope & definition mapping

| Context | Capture | Notes |
|---|---|---|
| `source_file` | `@local.scope` | Top-level scope |
| `root_rule` | `@local.scope` | Rule body scope |
| `class_rule` | `@local.scope` | Rule body scope |
| `template_rule` | `@local.scope` | Rule body scope |
| `widget_declaration` | `@local.scope` | Child widget scope |
| `(class_entry name: (identifier))` | `@local.definition.type` | Defines widget type |
| `(template_entry name: (identifier))` | `@local.definition.type` | Defines template type |
| `(root_rule name: (identifier))` | `@local.definition.type` | Root widget type |
| `(import_directive alias: (identifier))` | `@local.definition.import` | Import alias |
| `(set_directive name: (identifier))` | `@local.definition.constant` | Set constant |
| `(id_declaration name: (identifier))` | `@local.definition.variable` | ID assignment |
| `(widget_declaration name: (identifier))` | `@local.reference` | Reference to widget class |
| `(class_entry base: (identifier))` | `@local.reference` | Base class reference |
| `(template_entry base: (identifier))` | `@local.reference` | Base class reference |
| `(canvas_instruction name: (identifier))` | `@local.reference` | Canvas instruction reference |
| `(event_binding handler: ...)` | `@local.reference` | Handler reference |
| `identifier` (in property values) | `@local.reference` | Variable reference |

### `tags.scm` — Document symbol mapping

| Context | Name | Capture | Notes |
|---|---|---|---|
| `class_entry` `name` | `(identifier) @name` | `@definition.class` | Dynamic widget class |
| `template_entry` `name` | `(identifier) @name` | `@definition.class` | Template widget class |
| `root_rule` `name` | `(identifier) @name` | `@definition.class` | Root rule widget type |
| `import_directive` `alias` | `(identifier) @name` | `@definition.import` | Import |
| `set_directive` `name` | `(identifier) @name` | `@definition.constant` | Set constant |
| `id_declaration` `name` | `(identifier) @name` | `@definition.variable` | ID symbol |

## Edge Cases

1. **`_raw_value` is invisible**: The `_raw_value` token (trailing raw text after typed values) is a hidden rule and produces no queryable node. It cannot be highlighted directly. Example: `expr: self.parent.width * 0.5` → the ` * 0.5` part is consumed but invisible in the tree.

2. **`dotted_ref` is a single token**: `module.Class.property` is one atom. We cannot individually highlight each part (module vs class vs property). The whole node gets one capture. Context-dependent highlighting (event handler vs property value) works via the parent node.

3. **`identifier` everywhere**: The same `identifier` node type serves as property name, widget name, class name, variable reference, import alias, etc. Semantic distinction is entirely via parent context. **Query ordering matters** — more specific parent-context captures must be listed before the catch-all `(identifier) @variable`.

4. **`canvas.before` / `canvas.after`** are anonymous tokens (not identifiers). They're the `name` field of `canvas_block`. Highlighted as `@keyword`.

5. **`event_name` starts with `on_`**: The token is `on_<name>`. It's NOT an identifier — it's a dedicated token. Map to `@attribute` (treating it as an event attribute on the widget).

6. **Negated class rule `<-Name>:`**: The `-` before `Name` is the negation operator. The negated `identifier` is `Name` itself (a widget type reference).

7. **Multiclass `<A, B, C>:`**: Multiple `class_entry` nodes, each with their own `name` identifier. Each entry is a separate symbol.

8. **Global rule `<>:`**: A `class_rule` with NO `class_entry` children at all. The only contents are body declarations. No symbols to capture at class level.

9. **`@` without name**: `<@Button>:` produces a `class_entry` with only `base:` (no `name:`). This is valid kvlang.

10. **Template rule `[]:` ERROR**: Empty brackets produce a `MISSING identifier` in `template_entry name:`. The missing node is a sentinel, not a real identifier — queries will not match it.

11. **`None` vs `None` keyword**: `None` is an anonymous literal token, not a named node. Must be matched as `"None" @constant.builtin`.

12. **`boolean` is a named node**: `True`/`False` are captured as `(boolean)` — they're NOT anonymous tokens. Query: `(boolean) @boolean`.

## Risks

- **Query ordering**: `(identifier) @variable` (catch-all) must come AFTER more specific captures that also match `identifier` nodes, or the specific captures won't apply. In Neovim, more specific patterns win regardless of order, but for maximum compatibility across editors, put specific captures first.
- **No built-in test for queries**: tree-sitter CLI does not validate query files. Queries must be tested by actually loading them in an editor. Manual verification against known .kv files is essential.
- **`tree-sitter.json` updates**: May need to add `"locals"` and `"tags"` entries. Current config only has `"highlights"`.
- **Editor-specific predicates**: `#any-of?` and `#match?` predicates (Approach 3) are lua-specific in Neovim. Other editors (Helix, Zed) may not support them. Stick to pure S-expression matches for portability.

## Ready for Proposal

**Yes**. The analysis is complete. The user should move to `sdd-propose` with scope = all three query files (highlights, locals, tags), using Neovim standard captures and the mappings documented above.
