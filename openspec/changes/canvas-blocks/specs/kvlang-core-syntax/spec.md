# Delta for kvlang-core-syntax

## MODIFIED Requirements

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
