# Exploration: Canvas Blocks for tree-sitter-kivy

## Current State

The current grammar (`grammar.js`) handles three declaration types inside `_rule_body`: `widget_declaration`, `event_binding`, `id_declaration`, and `property`. There is NO canvas block support.

### What currently parses (and what breaks)

| Source | Current Result | Issue |
|--------|---------------|-------|
| `canvas:` (simple) | Parses as `widget_declaration(name: "canvas")` with children — no ERROR, but wrong semantics | Structurally works because `canvas:` matches `identifier ':'` |
| `canvas.before:` | **ERROR — `canvas` parsed as identifier, then `.` unmatched** | Identifier rule `/[a-zA-Z_]\w*/` does NOT accept dots |
| `canvas.after:` | **ERROR — `canvas` parsed as identifier, then `.` unmatched** | Same dot issue |
| `canvas:` → `Color: rgba:` inside | Parses as nested `widget_declaration` → `property` — no ERROR | Wrong semantics but structurally correct |
| `Clear` (no colon) | **ERROR — bare identifier not matched by any declaration** | No declaration rule accepts bare identifiers |
| `PushMatrix` / `PopMatrix` | **ERROR — same as Clear** | Same issue |

### Critical detail: dot in `canvas.before` / `canvas.after`

The current identifier rule:
```javascript
identifier: $ => /[a-zA-Z_]\w*/
```

This regex uses `\w` (alphanumeric + underscore) which does NOT include `.`. When the parser encounters `canvas.before:`, it:
1. Matches `canvas` as `identifier`
2. Sees `.` which does not match any expected token → **ERROR node**
3. Recovering from the error produces cascading failures

## Canvas Syntax in Real .kv Files

### Three canvas forms

```kv
canvas:              # Default canvas (main drawing)
canvas.before:       # Pre-draw (rendered before the widget's own canvas)
canvas.after:        # Post-draw (rendered after the widget's own canvas)
```

### Canvas instruction categories

**Context instructions** (modify OpenGL state, don't draw directly):
| Instruction | Has body? | Properties |
|-------------|-----------|------------|
| `Color` | Yes `:` | `rgb`, `rgba`, `hsv`, `a` |
| `Rotate` | Yes `:` | `angle`, `origin`, `axis` |
| `Scale` | Yes `:` | `x`, `y`, `z`, `origin` |
| `Translate` | Yes `:` | `x`, `y`, `z` |
| `MatrixInstruction` | Yes `:` | `matrix` |

**Vertex instructions** (draw shapes — take `:` and property body):
| Instruction | Has body? | Key Properties |
|-------------|-----------|---------------|
| `Rectangle` | Yes `:` | `pos`, `size` |
| `RoundedRectangle` | Yes `:` | `pos`, `size`, `radius`, `segments` |
| `Ellipse` | Yes `:` | `pos`, `size`, `segments`, `angle_start`, `angle_end` |
| `Line` | Yes `:` | `points`, `width`, `cap`, `joint`, `dash_length`, `dash_offset`, `ellipse`, `rectangle`, `close` |
| `Triangle` | Yes `:` | `points` |
| `Quad` | Yes `:` | `points` |
| `Point` | Yes `:` | `points` |
| `Mesh` | Yes `:` | `vertices`, `indices`, `mode`, `fmt` |
| `Bezier` | Yes `:` | `points`, `segments` |
| `BorderImage` | Yes `:` | `pos`, `size`, `source`, `border` |
| `SmoothLine` | Yes `:` | `points`, `width` |

**No-body instructions** (bare identifier, no `:`):
| Instruction | Notes |
|-------------|-------|
| `Clear` | Clears the canvas of previous instructions |
| `PushMatrix` | Pushes current transformation matrix onto stack |
| `PopMatrix` | Pops transformation matrix from stack |
| `BindTexture` | Binds a texture (rare in .kv, more common in Python) |
| `Callback` | Calls a Python function (rare in .kv) |

### Structural patterns

Pattern 1 — Instruction with body (MOST common):
```kv
Color:
    rgba: (1, 0, 0, 1)
```
This is structurally identical to a widget declaration: `Name:` followed by indented properties.

Pattern 2 — No-body instruction:
```kv
PushMatrix
```
This is JUST a bare identifier on its own line within a canvas block.

Pattern 3 — Property value:
```kv
width: 2
```
Same syntax as widget properties — `identifier ':' value`.

### Nested canvas instructions?

Canvas instructions do NOT nest in standard Kivy. Each instruction is a sibling inside the canvas block. Context instructions affect subsequent vertex instructions:
```kv
canvas:
    Color:           # ← context
        rgba: (1,0,0,1)
    Rectangle:       # ← vertex (uses the Color above)
        pos: self.pos
        size: self.size
```

The only "nesting" is the canvas block itself → no nested canvas blocks.

## Grammar Changes Needed

### 1. Fix `canvas.before` / `canvas.after` parsing

The core issue is that dots in identifiers break the grammar. Three approaches:

**1a. Change the identifier rule** to `/[a-zA-Z_][\w.]*` — simple but overly permissive (dots in ALL identifiers).

**1b. Use literal string matching for canvas headers** — add canvas_block as a separate rule with `'canvas'`, `'canvas.before'`, `'canvas.after'` as string literals. Tree-sitter's string matching has priority over named rules, so this disambiguates naturally.

**1c. Create a special `canvas_identifier`** rule: `$ => /canvas(\.[a-z]+)?/` — narrow scope.

### 2. Handle no-body instructions

`Clear`, `PushMatrix`, `PopMatrix` do NOT have `:` after them. The grammar needs a declaration rule that matches a bare identifier on its own line.

### 3. Group canvas content semantically

Should canvas block content be its own node type, or can it reuse existing declaration types?

## Approach Options

### Option A: Minimal — Identifier fix only

Change the identifier rule to accept dots; no new semantic nodes.

```javascript
identifier: $ => /[a-zA-Z_][\w.]*/
```

**What this fixes**: `canvas.before:` and `canvas.after:` now parse (as `widget_declaration` with dotted names). No more ERROR nodes for those.

**What still breaks**: `Clear`, `PushMatrix`, `PopMatrix` (no colon → no declaration matches).

**Pros:**
- Smallest possible change (1 line in grammar.js)
- All existing tests unaffected
- Canvas WITH body content parses correctly

**Cons:**
- Dots allowed in ALL identifiers (overly permissive — `Widget.name:` would parse, which is not valid kvlang)
- `canvas:` still parsed as `widget_declaration` (wrong semantics)
- No-body instructions still produce ERROR

**Effort**: Low (~1 line change + 1 test case)

### Option B: Semantic — Full canvas block with dedicated nodes

Add explicit `canvas_block`, `canvas_instruction`, and `canvas_instruction_atom` node types.

```javascript
_canvas_header: $ => choice('canvas', 'canvas.before', 'canvas.after'),

canvas_block: $ => seq(
  field('name', $._canvas_header),
  ':',
  choice(
    $._newline,
    seq($._indent, repeat($._canvas_content), $._dedent),
  ),
),

_canvas_content: $ => choice(
  $.canvas_instruction,     // Color:, Rectangle:, etc.
  $.canvas_instruction_atom, // Clear, PushMatrix, PopMatrix
  $.property,               // rgba:, pos:, etc.
),

canvas_instruction: $ => seq(
  field('name', $.identifier),
  ':',
  choice($._newline, seq($._indent, repeat($._declaration), $._dedent), $._dedent),
),

canvas_instruction_atom: $ => seq(
  field('name', choice('Clear', 'PushMatrix', 'PopMatrix', 'BindTexture', 'Callback')),
  $._newline,
),
```

**What this fixes**: Everything — `canvas.before:`, `canvas.after:`, no-body instructions all parse. Correct semantic tree.

**Pros:**
- Correct CST with semantic node types
- Proper distinction between canvas and widget content
- Handles all canvas instruction patterns

**Cons:**
- More complex grammar (new rules, more code)
- The `canvas_instruction` rule is nearly identical to `widget_declaration` — duplication
- More grammar to maintain and test
- Potential ambiguity between `canvas_instruction` and `widget_declaration` at the choice level (both start with `identifier ':'`)

**Effort**: Medium (~30 lines grammar.js + ~6 test cases)

### Option C: Hybrid — Canvas block grouping with content reuse

Add a `canvas_block` container rule that uses literal matching for headers but reuses existing `widget_declaration` and `property` rules for the content. Add a new rule for no-body instructions.

```javascript
_canvas_header: $ => choice('canvas', 'canvas.before', 'canvas.after'),

canvas_block: $ => seq(
  field('name', $._canvas_header),
  ':',
  choice(
    $._newline,
    seq($._indent, repeat(choice($._declaration, $._canvas_atom)), $._dedent),
  ),
),

_canvas_atom: $ => seq(
  choice('Clear', 'PushMatrix', 'PopMatrix'),
  $._newline,
),
```

And add `canvas_block` to the `_declaration` choice:
```javascript
_declaration: $ => choice(
  $.canvas_block,
  $.widget_declaration,
  $.event_binding,
  $.id_declaration,
  $.property,
),
```

This relies on tree-sitter's GLR to resolve the ambiguity: when the parser sees `canvas:`, both `canvas_block` (via literal `'canvas'`) and `widget_declaration` (via `identifier`) are possible. The literal string `'canvas'` has priority in tree-sitter, so `canvas_block` wins. For `canvas.before:`, only `canvas_block` matches (the `.` would break `identifier`).

**What this fixes**: Everything — `canvas.before:`, `canvas.after:`, no-body instructions, correct grouping.

**Pros:**
- No change to the `identifier` rule (no broader impact)
- Canvas content reuses existing `_declaration` types (no duplication)
- No-body instructions handled via dedicated rule
- Semantic grouping: `canvas_block` wraps all canvas content
- Simple, focused changes

**Cons:**
- Instructions inside canvas blocks still show as `widget_declaration` (not ideal for LSP tooling but fine for syntax highlighting)
- Literal `'canvas'` matching means no widget can legally be named "canvas" in the grammar (acceptable — no real widget uses this name)

**Effort**: Low-Medium (~15-20 lines grammar.js + ~5 test cases)

## Recommendation

**Option C: Hybrid** is recommended for this change.

**Rationale:**
1. **Fixes all parse errors** — `canvas.before:`, `canvas.after:`, and bare instructions (Clear, PushMatrix, PopMatrix) all parse without ERROR
2. **No global identifier change** — the `.` in `canvas.before` is handled by literal string matching, not by broadening the identifier regex
3. **Minimal new rules** — only `canvas_block` and `_canvas_atom` need to be added; content types are reused
4. **Prioritized correctly** — tree-sitter prioritizes string literals over named rules in choice contexts, so `'canvas'` in `canvas_block` wins over `identifier` in `widget_declaration`
5. **Backward compatible** — all 37 existing corpus tests should pass unchanged

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Ambiguity with `canvas` as widget name** | If someone writes `canvas:` intending a widget named "canvas", the grammar interprets it as a canvas block | Acceptable — no real-world Kivy code uses "canvas" as a widget name. If needed later, the grammar can be refined. |
| **No-body instructions list incomplete** | Missing instructions produce ERROR nodes instead of `_canvas_atom` | Start with only `Clear`, `PushMatrix`, `PopMatrix` — the only three confirmed no-body standard instructions. Add others as discovered. |
| **`_canvas_header` ordering** | `'canvas'` could match first before `'canvas.before'` in a choice, causing `canvas.before` to partially match `'canvas'` + error on `.` | Order as `'canvas.before'`, `'canvas.after'`, `'canvas'` — most specific first. Tree-sitter requires exact match for string literals, so `.` after `'canvas'` would NOT match. |
| **Indentation edge cases** | Canvas content at wrong indent level could confuse indent tracking | Already handled by existing scanner — no change needed. |
| **Property value containing canvas-like text** | `value: canvas.before` in a property would match differently | No risk — property values are `token.immediate(/[^\n\r]+/)` raw text, not parsed as grammar. |

## Ready for Proposal

**Yes.** Exploration is complete. The orchestrator should proceed to **sdd-propose** with these findings.

### Summary for proposal phase

- **Scope**: Add canvas block support (`canvas:`, `canvas.before:`, `canvas.after:`) with graphic instruction content
- **Approach**: Option C (Hybrid) — `canvas_block` node with `_canvas_header` literal matching, recycle existing `_declaration` types for content, add `_canvas_atom` for no-body instructions
- **Files to modify**:
  - `grammar.js` — add `canvas_block`, `_canvas_atom`, modify `_declaration`
  - `test/corpus/canvas.txt` — new test file for canvas blocks
- **Files unchanged**: `src/scanner.c` — no scanner changes needed
