# Delta for kvlang-core-syntax

## MODIFIED Requirements

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
