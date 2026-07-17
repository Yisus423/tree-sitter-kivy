# Delta Spec: Rename `property_value` → `value`, Remove `event_statement`

## Capability

`kvlang-core-syntax`

## MODIFIED Requirements

### Requirement: Declaration Lines

A declaration MUST be property (`identifier: <value>`), event binding (`on_identifier:` followed by inline handler or indented `event_body` block), ID (`id: name`), or canvas block (`canvas:`, `canvas.before:`, `canvas.after:`). ID value MUST be a bare identifier or quoted string. Property values MUST be a catch-all raw text token (the entire line after `:`); type resolution is delegated to tree-sitter-python via language injection in `injections.scm`. An event binding's inline handler MUST be a `value`. An event binding's multiline form MUST be followed by a NEWLINE and INDENT after the colon, and SHALL contain zero or more hidden `_expression_line` rules per non-blank line under an `event_body` node. Blank lines inside `event_body` SHALL be silently skipped. Comments inside `event_body` SHALL be permitted.

| GIVEN | Expectation |
|-------|-------------|
| `text: "Hello"` | property node: key "text", value `(value)` (raw text `"Hello"`) |
| `font_size: 24` | property node: key "font_size", value `(value)` (raw text `24`) |
| `opacity: 0.5` | property node: key "opacity", value `(value)` (raw text `0.5`) |
| `offset: -3` | property node: key "offset", value `(value)` (raw text `-3`) |
| `disabled: True` | property node: key "disabled", value `(value)` (raw text `True`) |
| `disabled: False` | property node: key "disabled", value `(value)` (raw text `False`) |
| `color: None` | property node: key "color", value `(value)` (raw text `None`) |
| `size_hint: size` | property node: key "size_hint", value `(value)` (raw text `size`) |
| `pos: self.center_x` | property node: key "pos", value `(value)` (raw text `self.center_x`) |
| `size: (100, 200)` | property node: key "size", value `(value)` (raw text `(100, 200)`) |
| `size: (100,)` | property node: key "size", value `(value)` (raw text `(100,)`) |
| `font_size: self.parent.width * 0.5` | property node: key "font_size", value `(value)` (raw text `self.parent.width * 0.5`) |
| `size_hint: (root.x + root.y)` | property node: key "size_hint", value `(value)` (raw text `(root.x + root.y)`) |
| `on_press: print("clicked")` | event_binding: event "press" |
| `on_release:\n    root.go()\n    root.stop()` in rule body | event_binding: event "release", handler `(event_body)` |
| `on_press:\n    self.action()` in rule body | event_binding: event "press", handler `(event_body)` |
| `on_release:\n    root.cleanup()\n  text: "Done"` in rule body | event_binding with `(event_body)`, then property node |
| `on_release:\n    # comment\n    root.start()` in rule body | event_binding: `(event_body)` containing `(comment)` |
| `on_release:\n    root.a()\n\n    root.b()` in rule body | event_binding: `(event_body)`, blank line silently skipped |
| `id: my_button` | id_declaration: value "my_button" |
| `id: "my_button"` | id_declaration: value "my_button" |
| `canvas:` in rule body | `canvas_block` node |
| `canvas.before:` in rule body | `canvas_block` node |
| `text "Hello"` | ERROR — missing colon |

## Summary of Changes

| Change | Detail |
|--------|--------|
| `property_value` → `value` | Visible CST node renamed; affects property declaration values and inline event binding handlers |
| `event_statement` → removed | Replaced by hidden `_expression_line` rule — no longer visible in CST |
| `event_body` child semantics | CST output shows `(event_body)` with anonymous (hidden) body lines instead of `(event_statement)` children |
| Scenario table updated | All `property_value` → `(value)`, all `event_statement` references removed, `event_body` → `(event_body)` |
