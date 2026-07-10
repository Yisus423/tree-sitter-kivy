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

Root rules MUST be a bare identifier at level 0 ending with colon (`WidgetName:`). Class rules MUST be one of the following forms in angle brackets at level 0 ending with colon: `<WidgetName>:` (standard class), `<>:` (global — applies to all classes), or `<-Name>:` (negated — applies to all classes except Name). Class rules MAY include an optional `@` followed by one or more base class identifiers (separated by `+`) for dynamic class inheritance: `<Name@Base>:`, `<Name@Base1+Base2>:`. The global form `<>:` SHALL NOT have a name, base, or negation. The negated form `<-Name>:` SHALL support exactly one identifier and SHALL NOT combine with `@`. Both `<>:` and `<-Name>:` MAY have a rule body via indented children.
(Previously: class rules only supported a single identifier in angle brackets, with optional `@` base syntax. Added `<>:` global and `<-Name>:` negated forms.)

| GIVEN | Expectation |
|-------|-------------|
| `BoxLayout:` at level 0 | root_rule node with name "BoxLayout" |
| `<MyButton>:` at level 0 | class_rule node with name "MyButton" |
| `BoxLayout` at level 0 | ERROR — missing colon |
| `<CustomButton@Button>:` at level 0 | class_rule node with name "CustomButton" and base "Button" |
| `<NewWidget@Behavior+Label>:` at level 0 | class_rule node with name "NewWidget" and base fields "Behavior", "Label" |
| `<@Button>:` at level 0 | ERROR — missing name before `@` |
| `<>:` at level 0 | class_rule node, no name or negated field (global rule) |
| `<-Button>:` at level 0 | class_rule node with negated field "Button" |
| `<-Name@Base>:` at level 0 | ERROR — negation cannot combine with `@` |

### Requirement: Rule Bodies

Rule header + INDENT MUST produce a `block` child closed by matching DEDENT. Empty blocks SHALL parse without error.

| GIVEN | Expectation |
|-------|-------------|
| Header + INDENT + property + DEDENT | block child contains one property node |
| Header + INDENT + DEDENT | block with zero children, no ERROR |

### Requirement: Declaration Lines

A declaration MUST be property (`identifier: raw_text`), event binding (`on_identifier: raw_text`), ID (`id: name`), or canvas block (`canvas:`, `canvas.before:`, `canvas.after:`). ID value MUST be a bare identifier or quoted string.
(Previously: canvas block was not a recognized declaration type)

| GIVEN | Expectation |
|-------|-------------|
| `  text: "Hello"` | property node: key "text", value `"Hello"` |
| `  font_size: self.parent.width * 0.5` | property captures full expression |
| `  on_press: print("clicked")` | event_binding: event "press" |
| `  id: my_button` | id_declaration: value "my_button" |
| `  id: "my_button"` | id_declaration: value "my_button" (quoted accepted, matching real Kivy) |
| `  canvas:` inside a rule body | `canvas_block` node, not `widget_declaration` — literal `'canvas'` matched first |
| `  canvas.before:` inside a rule body | `canvas_block` node — dotted form only matches `canvas_block` |
| `  text "Hello"` | ERROR — missing colon |

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
