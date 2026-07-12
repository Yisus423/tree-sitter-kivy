# Delta for kvlang-core-syntax

## MODIFIED Requirements

### Requirement: Rule Headers

Root rules MUST be a bare identifier at level 0 ending with colon (`WidgetName:`). Class rules MUST be in angle brackets at level 0 ending with colon and MUST be one of two forms: a single-entry form (`<WidgetName>:`, `<>:`, `<-Name>:`) or a multiclass form with one or more comma-separated entries (`<A, B, C>:`).

Single-entry forms support standard class (`<WidgetName>:`), global (`<>:` — applies to all classes), and negated (`<-Name>:` — applies to all classes except Name). Single entries MAY include an optional `@` followed by one or more base class identifiers (separated by `+`) for dynamic inheritance.

Multiclass form SHALL contain two or more `class_entry` nodes separated by commas. Trailing commas in multiclass SHALL produce ERROR. Negated entries (prefixed by `-`) in multiclass SHALL produce ERROR. The global form `<>:` SHALL NOT have a name, base, or negation. The negated form `<-Name>:` SHALL support exactly one identifier and SHALL NOT combine with `@`. Both `<>:` and `<-Name>:` MAY have a rule body via indented children.

(Previously: class rules only supported a single identifier in angle brackets. Added multiclass form with comma-separated entries; existing single-entry scenarios now wrap each entry in a `class_entry` node.)

| GIVEN | WHEN | THEN |
|-------|------|------|
| `BoxLayout:` at level 0 | parsed | root_rule node with name "BoxLayout" |
| `BoxLayout` at level 0 | parsed | ERROR — missing colon |
| `<MyButton>:` at level 0 | parsed | class_rule with one class_entry (name: "MyButton") |
| `<-Button>:` at level 0 | parsed | class_rule with negated field "Button" |
| `<-Name@Base>:` at level 0 | parsed | ERROR — negation cannot combine with @ |
| `<>:` at level 0 | parsed | class_rule with one class_entry (no name field) |
| `<CustomButton@Button>:` at level 0 | parsed | class_rule with class_entry (name: "CustomButton", base: "Button") |
| `<NewWidget@Behavior+Label>:` at level 0 | parsed | class_rule with class_entry (name: "NewWidget", bases: "Behavior", "Label") |
| `<@Button>:` at level 0 | parsed | ERROR — missing name before @ |
| `<ButtonA, ButtonB>:` at level 0 | parsed | class_rule with two class_entry children (names: "ButtonA", "ButtonB") |
| `<Custom@Button, Icon@Label>:` at level 0 | parsed | class_rule with two class_entry: (Custom, Button) and (Icon, Label) |
| `<A, B, C>:` at level 0 | parsed | class_rule with three class_entry children |
| `<A, B, >:` at level 0 | parsed | ERROR — trailing comma |
| `<A, -B>:` at level 0 | parsed | ERROR — negated entries not valid in multiclass |

## ADDED Requirements

### Requirement: class_entry Node

Each `class_entry` node SHALL represent one entry inside a `class_rule`. The node SHALL have an optional `name` field (identifier) — absent for the global `<>:` form. The node SHALL have an optional `base` field (identifier or `+`-separated identifiers) — present only for dynamic class inheritance. Every `class_entry` MUST be queryable via tree-sitter queries (e.g., `(class_entry) @entry`). Entry-type mixing within a single rule is NOT enforced by the grammar — it is a Kivy runtime constraint.

| GIVEN | WHEN | THEN |
|-------|------|------|
| `<MyButton>:` at level 0 | queried `(class_entry) @e` | captures class_entry with name "MyButton" |
| `<>:` at level 0 | queried `(class_entry) @e` | captures class_entry with no name field |
| `<Custom@Button>:` at level 0 | queried `(class_entry) @e` | captures class_entry with name "Custom", base "Button" |
