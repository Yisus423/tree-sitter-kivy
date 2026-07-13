# tree-sitter-queries Specification

## Purpose

Define `.scm` query files for kvlang: `highlights.scm`, `locals.scm`, and `tags.scm`.

## Requirements

### Requirement: highlights.scm — Syntax Highlighting

The system MUST produce `queries/highlights.scm` with Neovim-standard capture names. Parent-context captures precede catch-all `(identifier)` rules.

| Node / Context | Capture |
|---|---|
| `comment` | `@comment @spell` |
| `string` | `@string` |
| `number` | `@number` |
| `boolean` | `@boolean` |
| `"None"` | `@constant.builtin` |
| `(property name: (identifier))` | `@property` |
| `(widget_declaration name: (identifier))` | `@type` |
| `(canvas_instruction name: (identifier))` | `@type` |
| `(root_rule name: (identifier))` | `@type` |
| `(class_entry name: (identifier))` | `@type.definition` |
| `(class_entry base: (identifier))` | `@type` |
| `(template_entry name: (identifier))` | `@type.definition` |
| `(class_rule negated: (identifier))` | `@type` |
| `(import_directive alias: (identifier))` | `@module` |
| `(import_directive module: ...)` | `@string.special.path` |
| `(set_directive name: (identifier))` | `@constant` |
| `(include_directive path: ...)` | `@string.special.path` |
| `(kivy_directive version: ...)` | `@string.special` |
| `(event_binding event: (event_name))` | `@attribute` |
| `(event_binding handler: ... (identifier))` | `@function` |
| `(event_binding handler: ... (dotted_ref))` | `@function.method` |
| `(id_declaration name: (identifier))` | `@variable` |
| `(id_declaration name: (string))` | `@string` |
| `(property value: ... (dotted_ref))` | `@variable.member` |
| `(property value: ... (identifier))` | `@variable` |
| `dotted_ref` | `@variable.member` |
| `identifier` (catch-all) | `@variable` |
| `canvas` / `canvas.before` / `canvas.after` | `@keyword` |
| `":"` `","` `"."` | `@punctuation.delimiter` |
| `"("` `")"` `"["` `"]"` `"{"` `"}"` `"<"` `">"` | `@punctuation.bracket` |
| `"@"` `"+"` `"-"` | `@operator` |
| `"import"` `"include"` | `@keyword.import` |
| `"set"` `"kivy"` `"id"` | `@keyword` |

#### Scenario: Property name before catch-all identifier

- GIVEN `font_size: 24`
- WHEN highlights.scm queries the file
- THEN `(property name: (identifier) @property)` captures `font_size`
- AND catch-all `(identifier) @variable` does not override it

### Requirement: locals.scm — Scope and Definition Tracking

Produce `queries/locals.scm` with `@local.*` captures for scopes, definitions, and references.

| Context | Capture |
|---|---|
| `source_file` / `root_rule` / `class_rule` / `template_rule` / `widget_declaration` | `@local.scope` |
| `(class_entry name: (identifier))` | `@local.definition.type` |
| `(template_entry name: (identifier))` | `@local.definition.type` |
| `(root_rule name: (identifier))` | `@local.definition.type` |
| `(import_directive alias: (identifier))` | `@local.definition.import` |
| `(set_directive name: (identifier))` | `@local.definition.constant` |
| `(id_declaration name: (identifier))` | `@local.definition.variable` |
| `(widget_declaration name: (identifier))` | `@local.reference` |
| `(class_entry base: (identifier))` | `@local.reference` |
| `(template_entry base: (identifier))` | `@local.reference` |
| `(canvas_instruction name: (identifier))` | `@local.reference` |
| `(event_binding handler: ...)` | `@local.reference` |

#### Scenario: ID tracked as definition

- GIVEN a root_rule body with `id: btn`
- WHEN locals.scm processes the file
- THEN `btn` captures as `@local.definition.variable`
- AND enclosing `widget_declaration` captures as `@local.scope`

### Requirement: tags.scm — Document Symbol Navigation

The system MUST produce `queries/tags.scm` using `@name` + `@definition.*` convention for `tree-sitter tags`.

| Context | Capture |
|---|---|
| `(class_entry name: (identifier) @name)` | `@definition.class` |
| `(template_entry name: (identifier) @name)` | `@definition.class` |
| `(root_rule name: (identifier) @name)` | `@definition.class` |
| `(import_directive alias: (identifier) @name)` | `@definition.import` |
| `(set_directive name: (identifier) @name)` | `@definition.constant` |
| `(id_declaration name: (identifier) @name)` | `@definition.variable` |

#### Scenario: Class rule document symbol

- GIVEN `<MyButton>:`
- WHEN tree-sitter tags processes the file
- THEN `(class_entry name: (identifier) @name)` captures `MyButton`
- AND `@definition.class` captures the parent entry

### Requirement: tree-sitter.json Update

The system MUST add `"locals": ["queries/locals.scm"]` and `"tags": ["queries/tags.scm"]` to the kivy grammar entry.

#### Scenario: Grammar config extended

- GIVEN tree-sitter.json has only `highlights`
- WHEN the config is updated
- THEN the kivy grammar SHALL include `locals` and `tags` entries

### Requirement: Portable Query Syntax

All queries MUST use pure S-expressions. No predicates (`#any-of?`, `#match?`, `#set!`) SHALL be used.

#### Scenario: Predicate-free match

- GIVEN `(boolean) @boolean`
- WHEN parsed by any tree-sitter runtime
- THEN it SHALL match without predicates
