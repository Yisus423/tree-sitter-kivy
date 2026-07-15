# kvlang-core-syntax — Delta Spec

## MODIFIED Requirements

### Requirement: Declaration Lines

A declaration MUST be property (`identifier: <property_value>`), event binding (`on_identifier:` followed by inline handler or indented `event_body` block), ID (`id: name`), or canvas block (`canvas:`, `canvas.before:`, `canvas.after:`). ID value MUST be a bare identifier or quoted string. Property values MUST be one of: string, number, boolean, `None`, bare identifier, dotted reference, parenthesized tuple, or catch-all raw value. An event binding's inline handler MUST be a `property_value`. An event binding's multiline form MUST be followed by a NEWLINE and INDENT after the colon, and SHALL contain zero or more `event_statement` nodes per non-blank line under an `event_body` node. Blank lines inside `event_body` SHALL be silently skipped. Comments inside `event_body` SHALL be permitted.
(Previously: property values were flat `token.immediate(/[^\n\r]+/)` raw text; now structured `choice()` of typed child nodes. `_raw_value` renamed to `raw_value`; `(`-starting expressions now parse via `raw_value` catch-all instead of ERROR. Event binding was `on_identifier: raw_text` only; handler now supports `choice(property_value, event_body)` with per-line `event_statement` child nodes.)

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
| `font_size: self.parent.width * 0.5` | property node: key "font_size", value `raw_value` child (expression falls to catch-all) |
| `size_hint: (root.x + root.y)` | property node: key "size_hint", value `raw_value` child (expression starting with `(` falls to catch-all) |
| `on_press: print("clicked")` | event_binding: event "press" |
| `on_release:\n    root.go()\n    root.stop()` in rule body | event_binding: event "release", handler `event_body` with two `event_statement` children |
| `on_press:\n    self.action()` in rule body | event_binding: event "press", handler `event_body` with one `event_statement` child |
| `on_release:\n    root.cleanup()\n  text: "Done"` in rule body | event_binding with `event_body`, then property node |
| `on_release:\n    # comment\n    root.start()` in rule body | event_binding: `event_body` containing comment token and `event_statement` |
| `on_release:\n    root.a()\n\n    root.b()` in rule body | event_binding: `event_body` with two `event_statement`, blank line silently skipped |
| `id: my_button` | id_declaration: value "my_button" |
| `id: "my_button"` | id_declaration: value "my_button" |
| `canvas:` in rule body | `canvas_block` node |
| `canvas.before:` in rule body | `canvas_block` node |
| `text "Hello"` | ERROR — missing colon |
