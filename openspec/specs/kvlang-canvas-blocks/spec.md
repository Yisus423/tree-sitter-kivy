# kvlang-canvas-blocks Specification

## Purpose

Defines parsing of Kivy canvas block headers (`canvas:`, `canvas.before:`, `canvas.after:`), grouping under a `canvas_block` node, body-less canvas instructions via dedicated `canvas_instruction` node, and body-ful canvas instructions with content restricted to `property` and `comment`. Nested canvas blocks are prevented at the grammar level. Additive alongside `kvlang-core-syntax`.

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

The `canvas_instruction` rule MUST include a body-less variant matching a bare `identifier` followed by a newline. Any identifier SHALL be accepted — no hardcoded name validation.
(Previously: `_canvas_atom` with 3 hardcoded identifiers `Clear`, `PushMatrix`, `PopMatrix`)

| GIVEN | Expectation |
|-------|-------------|
| `Clear` on its own line inside canvas block | `canvas_instruction` body-less node, no ERROR |
| `PushMatrix` on its own line inside canvas block | `canvas_instruction` body-less node, no ERROR |
| `PopMatrix` on its own line inside canvas block | `canvas_instruction` body-less node, no ERROR |
| `SomeOtherName` on its own line inside canvas block | `canvas_instruction` body-less node — generic identifier accepted |
| `Clear:` (with colon) inside canvas block | `canvas_instruction` body-ful variant — colon triggers body parsing |

### Requirement: Canvas Content Reuse

Canvas instruction bodies SHALL use a dedicated `canvas_instruction` named node. The body-ful variant SHALL contain `identifier ':'` followed by `repeat(choice($.property, $.comment))`. Canvas instructions MUST NOT reuse `widget_declaration`, `event_binding`, or `id_declaration` nodes.
(Previously: Reused existing `_declaration` types without dedicated node)

| GIVEN | Expectation |
|-------|-------------|
| `Color:` + `rgba: (1, 0, 0, 1)` inside canvas | `canvas_instruction` node with `identifier` and body `property` |
| `Rectangle:` + `pos:` + `size:` inside canvas | `canvas_instruction` with `identifier` and two body `property` nodes |
| `points: [0,0,100,0]` inside canvas | `canvas_instruction` with `identifier` and body `property` |
| `# comment` inside canvas block | `comment` node — allowed alongside `canvas_instruction` |

### Requirement: Backward Compatibility

All 80 existing corpus tests MUST pass. Grammar changes MUST NOT alter CST output for existing non-canvas parse trees. Six canvas tests SHALL have updated S-expression expectations.
(Previously: All 37 tests pass unchanged — no exceptions)

| GIVEN | Expectation |
|-------|-------------|
| All 24 core-syntax tests | Exact S-expression match — no CST changes |
| All 13 directives tests | Exact S-expression match — no CST changes |
| 6 canvas corpus tests | Updated expectations — `widget_declaration` → `canvas_instruction`, `_canvas_atom` → `canvas_instruction` |
| `color:` property (lowercase, not `Color:`) | Parsed as `property` node — unaffected by canvas rules |

### Requirement: Canvas Nesting Prevention

Canvas blocks MUST NOT nest. The `canvas_block` rule SHALL be removed from the `_declaration` choice. Canvas body content SHALL be restricted to `canvas_instruction` and `comment` only.

| GIVEN | Expectation |
|-------|-------------|
| `canvas:` inside a `canvas_block` body | Inner `canvas:` parses as `canvas_instruction`, NOT `canvas_block` — nesting prevented |
| Widget body with `canvas:` at valid indent | `canvas_block` node — unchanged top-level behavior |
