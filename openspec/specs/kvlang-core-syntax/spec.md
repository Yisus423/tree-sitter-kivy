# kvlang-core-syntax Specification

## Purpose

Defines core Kvlang (.kv) syntax: rule headers, widget declarations, properties, event bindings, IDs, and indentation-based block structure via external C scanner.

## Requirements

### Requirement: Source File Structure

Source file MUST contain zero or more rule headers at level 0, MAY include comments and blank lines between rules. Malformed content at level 0 SHOULD produce ERROR.

| GIVEN | Expectation |
|-------|-------------|
| `<A>:`, blank, `<B>:` at level 0 | Two class_rule children under source_file |
| Only `# comment` lines | Zero rule nodes; comments consumed as tokens |
| Random text at level 0 | ERROR node at top level |

### Requirement: Rule Headers

Root rules MUST be a bare identifier at level 0 ending with colon (`WidgetName:`). Class rules MUST be in angle brackets at level 0 ending with colon and MUST be one of two forms: a single-entry form (`<WidgetName>:`, `<>:`, `<-Name>:`) or a multiclass form with one or more comma-separated entries (`<A, B, C>:`).

Single-entry forms support standard class (`<WidgetName>:`), global (`<>:` — applies to all classes), and negated (`<-Name>:` — applies to all classes except Name). Single entries MAY include an optional `@` followed by one or more base class identifiers (separated by `+`) for dynamic inheritance.

Multiclass form SHALL contain two or more `class_entry` nodes separated by commas. Trailing commas in multiclass SHALL produce ERROR. Negated entries (prefixed by `-`) in multiclass SHALL produce ERROR. The global form `<>:` SHALL NOT have a name, base, or negation. The negated form `<-Name>:` SHALL support exactly one identifier and SHALL NOT combine with `@`. Both `<>:` and `<-Name>:` MAY have a rule body via indented children.

(Previously: class rules only supported a single identifier in angle brackets. Added multiclass form with comma-separated entries; existing single-entry scenarios now wrap each entry in a `class_entry` node.)

| GIVEN | Expectation |
|-------|-------------|
| `BoxLayout:` at level 0 | root_rule node with name "BoxLayout" |
| `BoxLayout` at level 0 | ERROR — missing colon |
| `<MyButton>:` at level 0 | class_rule with one class_entry (name: "MyButton") |
| `<-Button>:` at level 0 | class_rule with negated field "Button" |
| `<-Name@Base>:` at level 0 | ERROR — negation cannot combine with @ |
| `<>:` at level 0 | class_rule with one class_entry (no name field) |
| `<CustomButton@Button>:` at level 0 | class_rule with class_entry (name: "CustomButton", base: "Button") |
| `<NewWidget@Behavior+Label>:` at level 0 | class_rule with class_entry (name: "NewWidget", bases: "Behavior", "Label") |
| `<@Button>:` at level 0 | ERROR — missing name before @ |
| `<ButtonA, ButtonB>:` at level 0 | class_rule with two class_entry children (names: "ButtonA", "ButtonB") |
| `<Custom@Button, Icon@Label>:` at level 0 | class_rule with two class_entry: (Custom, Button) and (Icon, Label) |
| `<A, B, C>:` at level 0 | class_rule with three class_entry children |
| `<A, B, >:` at level 0 | ERROR — trailing comma |
| `<A, -B>:` at level 0 | ERROR — negated entries not valid in multiclass |

### Requirement: class_entry Node

Each `class_entry` node SHALL represent one entry inside a `class_rule`. The node SHALL have an optional `name` field (identifier) — absent for the global `<>:` form. The node SHALL have an optional `base` field (identifier or `+`-separated identifiers) — present only for dynamic class inheritance. Every `class_entry` MUST be queryable via tree-sitter queries (e.g., `(class_entry) @entry`). Entry-type mixing within a single rule is NOT enforced by the grammar — it is a Kivy runtime constraint.

| GIVEN | Expectation |
|-------|-------------|
| `<MyButton>:` at level 0 | queried `(class_entry) @e` captures class_entry with name "MyButton" |
| `<>:` at level 0 | queried `(class_entry) @e` captures class_entry with no name field |
| `<Custom@Button>:` at level 0 | queried `(class_entry) @e` captures class_entry with name "Custom", base "Button" |

### Requirement: Rule Bodies

Rule header + INDENT MUST produce a `block` child closed by matching DEDENT. Empty blocks SHALL parse without error.

| GIVEN | Expectation |
|-------|-------------|
| Header + INDENT + property + DEDENT | block child contains one property node |
| Header + INDENT + DEDENT | block with zero children, no ERROR |

### Requirement: Declaration Lines

A declaration MUST be property (`identifier: <property_value>`), event binding (`on_identifier: raw_text`), ID (`id: name`), or canvas block (`canvas:`, `canvas.before:`, `canvas.after:`). ID value MUST be a bare identifier or quoted string. Property values MUST be one of: string, number, boolean, `None`, bare identifier, dotted reference, parenthesized tuple, or catch-all raw value.
(Previously: property values were flat `token.immediate(/[^\n\r]+/)` raw text; now structured `choice()` of typed child nodes)

| GIVEN | Expectation |
|-------|-------------|
| `text: "Hello"` | property node: key "text", value `string` child |
| `font_size: 24` | property node: key "font_size", value `number` child `24` |
| `opacity: 0.5` | property node: key "opacity", value `number` child `0.5` |
| `offset: -3` | property node: key "offset", value `number` child `-3` |
| `disabled: True` | property node: key "disabled", value `boolean` child `True` |
| `disabled: False` | property node: key "disabled", value `boolean` child `False` |
| `color: None` | property node: key "color", value `_none` child |
| `size_hint: size` | property node: key "size_hint", value `identifier` child `size` |
| `pos: self.center_x` | property node: key "pos", value `dotted_ref` child `self.center_x` |
| `size: (100, 200)` | property node: key "size", value `tuple` child with elements 100, 200 |
| `size: (100,)` | property node: key "size", value `tuple` child with trailing comma |
| `font_size: self.parent.width * 0.5` | property node: key "font_size", value `_raw_value` child (expression falls to catch-all) |
| `on_press: print("clicked")` | event_binding: event "press" |
| `id: my_button` | id_declaration: value "my_button" |
| `id: "my_button"` | id_declaration: value "my_button" |
| `canvas:` in rule body | `canvas_block` node |
| `canvas.before:` in rule body | `canvas_block` node |
| `text "Hello"` | ERROR — missing colon |

### Requirement: Child Widget Declarations

Child widget MUST be a bare identifier ending with colon at deeper indent than enclosing rule.

| GIVEN | Expectation |
|-------|-------------|
| BoxLayout body with `  Button:` | widget_declaration inside rule's block |

### Requirement: Comments and Blank Lines

Comments (`#`) and blank lines MUST be parseable anywhere and SHALL NOT affect indent tracking.

| GIVEN | Expectation |
|-------|-------------|
| `# comment` then a property in body | Property still in same block, no DEDENT |
| Blank line between two properties | Both properties in same block |

### Requirement: Indentation and Lexical Tokens

Scanner MUST emit INDENT, DEDENT, NEWLINE tokens. Tabs MUST normalize to 8 spaces (each tab advances to next multiple of 8 per PEP 8). The scanner tracks column positions but does NOT validate indent level semantics — unexpected DEDENT/INDENT may produce ERROR nodes via the grammar, not the scanner.

| GIVEN | Expectation |
|-------|-------------|
| Two levels of 4-space indent | Correct INDENT/DEDENT at each boundary |
| 4-space then 6-space at same level | Scanner produces INDENT (sees 6 > 4); unexpected indent may produce ERROR via grammar GLR recovery |
| Tab-indented body (=8 spaces) | INDENT produced, tab normalized |
