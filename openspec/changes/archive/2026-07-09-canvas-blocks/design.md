# Design: Canvas Blocks

## Technical Approach

**Option C (Hybrid)** — Add a `canvas_block` container rule with literal-string header matching, a `_canvas_atom` rule for no-body instructions, and reuse existing `_declaration` types (`widget_declaration`, `property`, `event_binding`, `id_declaration`) for canvas instruction bodies. No scanner changes. Three files touched: `grammar.js` (modified), `test/corpus/canvas.txt` (new), `openspec/specs/kvlang-core-syntax/spec.md` (delta merged).

Reference specs: `kvlang-canvas-blocks` (new), `kvlang-core-syntax` (delta — declaration lines expanded).

## Architecture Decisions

### Decision: Header matching via literal strings

| Option | Tradeoff | Decision |
|--------|----------|----------|
| **Literal strings** (`'canvas.before'`, `'canvas.after'`, `'canvas'`) | Precise, no broader impact on identifier rule | ✅ **Chosen** |
| Widen identifier regex to accept dots | Overly permissive — `Widget.name:` would parse | ❌ Rejected |
| Special `canvas_identifier` rule | Narrows scope but adds another production | ❌ Rejected |

**Rationale**: Literals are exact — `'canvas.before'` matches only `canvas.before`, not `canvas.after` or other dotted names. The identifier regex `/[a-zA-Z_]\w*/` stays unchanged.

### Decision: Content reuse vs dedicated canvas instructions

| Option | Tradeoff | Decision |
|--------|----------|----------|
| **Reuse `_declaration` types** | No grammar duplication; `canvas_instruction` parsed as `widget_declaration` (fine for CST) | ✅ **Chosen** |
| New `canvas_instruction` node | Duplicates `widget_declaration` structure verbatim; more code | ❌ Rejected |

**Rationale**: Instructions with bodies (`Color:`, `Rectangle:`) are structurally identical to widget declarations — `identifier ':'` followed by indented properties. Reusing `widget_declaration` avoids maintaining near-duplicate rules.

### Decision: No-body instruction handling

| Option | Tradeoff | Decision |
|--------|----------|----------|
| **`_canvas_atom` rule** | Clean, focused rule for `Clear` / `PushMatrix` / `PopMatrix` | ✅ **Chosen** |
| No-colon variant of `widget_declaration` | Complexifies widget rule | ❌ Rejected |

### Decision: Scanner changes

| Option | Tradeoff | Decision |
|--------|----------|----------|
| **No scanner changes** | INDENT/DEDENT already correct for canvas blocks | ✅ **Chosen** |
| Custom canvas indent tokens | Unnecessary complexity | ❌ Rejected |

## Tree-sitter GLR Disambiguation

When the parser sees `canvas:` at a valid indent level, both `canvas_block` and `widget_declaration` are candidates. Tree-sitter's internal lexer assigns **higher priority to string literals** than to named-rule regex patterns. The literal `'canvas'` token wins over the `identifier` regex in the choice context, so `canvas_block` is matched.

For `canvas.before:`: the `identifier` regex `/[a-zA-Z_]\w*/` matches only `canvas` (`.` stops `\w`), leaving `.before:` unmatched. Only `canvas_block` via `'canvas.before'` literal succeeds.

This disambiguation is token-level — no GLR node merging needed at the parse tree level.

## Header Ordering: Most-Specific First

```javascript
_canvas_header: $ => choice('canvas.before', 'canvas.after', 'canvas'),
```

Defensive convention. Tree-sitter's lexer uses **longest-match** semantics among string literals, so `'canvas.before'` would match `canvas.before` regardless of ordering. But `'canvas.before'` first makes the intent explicit and mirrors scanner-level defense-in-depth for partial-prefix edge cases.

## Grammar Changes (grammar.js)

### New rules

```javascript
_canvas_header: $ => choice('canvas.before', 'canvas.after', 'canvas'),

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

### Modified rule

```javascript
_declaration: $ => choice(
  $.canvas_block,
  $.widget_declaration,
  $.event_binding,
  $.id_declaration,
  $.property,
),
```

`canvas_block` added as first choice — GLR resolves `canvas:` vs widget ambiguity automatically (see disambiguation section above).

### How `_canvas_atom` works

```
Clear\n
```
The scanner emits `NEWLINE` after `Clear`. The grammar matches `choice('Clear', 'PushMatrix', 'PopMatrix')` as a token, then `$._newline`. No colon involved — the bare identifier + newline forms a complete declaration.

### Content reuse in action

```kivy
canvas:
    Color:
        rgba: (1, 0, 0, 1)
    Rectangle:
        pos: self.pos
        size: self.size
```

Produces: `canvas_block(name: "canvas")` containing two `widget_declaration` nodes (Color, Rectangle), each containing `property` children — the exact same CST structure as nested widget declarations.

## Test Plan

| Scenario | Input | Expects |
|----------|-------|---------|
| Empty canvas block | `canvas:` alone | `canvas_block` with no body children |
| Canvas with body instructions | `canvas:` → Color + Rectangle | `canvas_block` containing `widget_declaration` nodes |
| canvas.before block | `canvas.before:` → Color | `canvas_block(name: "canvas.before")` |
| canvas.after block | `canvas.after:` → Color | `canvas_block(name: "canvas.after")` |
| No-body instructions | Clear, PushMatrix, PopMatrix in canvas | `_canvas_atom` nodes, no ERROR |
| Mixed content | Properties + atoms + instructions | All children under `canvas_block` |
| Backward compat | Existing widget tests | Exact S-expression match (37 tests) |
| Non-canvas `color:` | `color:` as property | Parsed as `property` node, not canvas |

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `grammar.js` | Modify | Add `_canvas_header`, `canvas_block`, `_canvas_atom`; update `_declaration` choice |
| `test/corpus/canvas.txt` | Create | ~6 corpus tests for all canvas forms |
| `src/scanner.c` | None | Verified — no scanner changes needed |
| `openspec/specs/kvlang-core-syntax/spec.md` | Modify | Delta merged: `_declaration` expanded to include canvas block |

## Open Questions

- None. Design is complete — the exploration, proposal, and specs resolve all technical questions.

## Risks

| Risk | Mitigation |
|------|------------|
| `canvas` as widget name | No real-world .kv files use "canvas" as a widget name; acceptable tradeoff |
| Incomplete no-body list | Start with 3 confirmed (`Clear`, `PushMatrix`, `PopMatrix`); extendable |
