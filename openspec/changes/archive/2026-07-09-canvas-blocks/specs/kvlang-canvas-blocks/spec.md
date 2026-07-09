# kvlang-canvas-blocks Specification

## Purpose

Defines parsing of Kivy canvas block headers (`canvas:`, `canvas.before:`, `canvas.after:`), grouping under a `canvas_block` node, no-body instructions (`Clear`, `PushMatrix`, `PopMatrix`), and reuse of existing declaration types for canvas instruction bodies. Additive alongside `kvlang-core-syntax` — adds `canvas_block` to the `_declaration` choice.

## Requirements

### Requirement: Canvas Block Headers

A canvas block MUST start with `canvas:`, `canvas.before:`, or `canvas.after:` at a valid indent level. The `_canvas_header` rule MUST match literal strings in order `'canvas.before'`, `'canvas.after'`, `'canvas'` (most specific first).

| GIVEN | Expectation |
|-------|-------------|
| `canvas:` at indent inside a rule body | `canvas_block` node with field `name: "canvas"` |
| `canvas.before:` at indent inside a rule body | `canvas_block` node with field `name: "canvas.before"` |
| `canvas.after:` at indent inside a rule body | `canvas_block` node with field `name: "canvas.after"` |

### Requirement: Canvas Block Structure

A `canvas_block` node MUST group its content under an indent/dedent block. An empty canvas block (no content after the colon) SHALL parse without error.

| GIVEN | Expectation |
|-------|-------------|
| `canvas:` + indent + one instruction + dedent | `canvas_block` with block child containing one child node |
| `canvas:` + newline (no content) | `canvas_block` with zero children, no ERROR |
| `canvas.before:` + indent + two instructions + dedent | `canvas_block` with block child containing two child nodes |

### Requirement: No-Body Canvas Instructions

The `_canvas_atom` rule MUST match bare identifiers `Clear`, `PushMatrix`, and `PopMatrix` followed by a newline. These tokens MUST NOT require a colon.

| GIVEN | Expectation |
|-------|-------------|
| `Clear` on its own line inside canvas block | `_canvas_atom` node, no ERROR |
| `PushMatrix` on its own line inside canvas block | `_canvas_atom` node, no ERROR |
| `PopMatrix` on its own line inside canvas block | `_canvas_atom` node, no ERROR |
| `Clear:` (with colon) inside canvas block | NOT a `_canvas_atom` — parsed via other declaration rules |

### Requirement: Canvas Content Reuse

Canvas instruction bodies SHALL reuse existing `_declaration` types (`widget_declaration`, `property`, `event_binding`, `id_declaration`) without dedicated `canvas_instruction` nodes. Only no-body instructions use `_canvas_atom`.

| GIVEN | Expectation |
|-------|-------------|
| `Color:` + `rgba: (1, 0, 0, 1)` inside canvas | `widget_declaration` with child `property` — same structure as widget bodies |
| `Rectangle:` + `pos:` + `size:` inside canvas | `widget_declaration` with two child `property` nodes |
| `points: [0,0,100,0]` inside canvas | `property` node with value field containing expression |

### Requirement: Backward Compatibility

All 37 existing corpus tests MUST pass unchanged. Grammar changes MUST NOT alter CST output for existing non-canvas parse trees.

| GIVEN | Expectation |
|-------|-------------|
| All 24 core-syntax tests | Exact S-expression match — no CST changes |
| All 13 directives tests | Exact S-expression match — no CST changes |
| `color:` property (lowercase, not `Color:`) | Parsed as `property` node — unaffected by canvas rules |
