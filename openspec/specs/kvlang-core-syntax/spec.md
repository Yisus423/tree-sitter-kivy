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

Root rules MUST be a bare identifier at level 0 ending with colon (`WidgetName:`). Class rules MUST be an identifier in angle brackets at level 0 ending with colon (`<WidgetName>:`).

| GIVEN | Expectation |
|-------|-------------|
| `BoxLayout:` at level 0 | root_rule node with name "BoxLayout" |
| `<MyButton>:` at level 0 | class_rule node with name "MyButton" |
| `BoxLayout` at level 0 | ERROR — missing colon |

### Requirement: Rule Bodies

Rule header + INDENT MUST produce a `block` child closed by matching DEDENT. Empty blocks SHALL parse without error.

| GIVEN | Expectation |
|-------|-------------|
| Header + INDENT + property + DEDENT | block child contains one property node |
| Header + INDENT + DEDENT | block with zero children, no ERROR |

### Requirement: Declaration Lines

A declaration MUST be property (`identifier: raw_text`), event binding (`on_identifier: raw_text`), or ID (`id: name`). ID value MUST be a bare identifier or quoted string.

| GIVEN | Expectation |
|-------|-------------|
| `  text: "Hello"` | property node: key "text", value `"Hello"` |
| `  font_size: self.parent.width * 0.5` | property captures full expression |
| `  on_press: print("clicked")` | event_binding: event "press" |
| `  id: my_button` | id_declaration: value "my_button" |
| `  id: "my_button"` | id_declaration: value "my_button" (quoted accepted, matching real Kivy) |
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
