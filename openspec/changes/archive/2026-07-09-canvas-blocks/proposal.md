# Proposal: Canvas Blocks

## Intent

Real .kv files use `canvas:`, `canvas.before:`, and `canvas.after:` blocks to define drawing instructions. The current grammar produces ERROR nodes for `canvas.before:` and `canvas.after:` (dots break the identifier regex) and no-body instructions like `Clear` fail to parse entirely. This change adds correct parse support for all canvas block forms.

## Scope

### In Scope
- Parse all three canvas forms: `canvas:`, `canvas.before:`, `canvas.after:`
- Parse no-body canvas instructions: `Clear`, `PushMatrix`, `PopMatrix`
- Group canvas content under a `canvas_block` node for semantic accuracy
- Reuse existing `widget_declaration` / `property` types for instruction bodies
- New corpus test file with ~6 test cases

### Out of Scope
- `states:` / `transitions:` blocks (deferred to future change)
- Semantic validation of canvas instruction properties
- Dedicated `canvas_instruction` node type — reuse `widget_declaration` for instructions with bodies instead

## Capabilities

### New Capabilities
- `kvlang-canvas-blocks`: canvas block header forms (`canvas`, `canvas.before`, `canvas.after`), no-body canvas instructions (`_canvas_atom`), and canvas-specific content patterns built on existing declaration types

### Modified Capabilities
- `kvlang-core-syntax`: `_declaration` rule expanded to include `canvas_block` as a valid declaration type within rule bodies; "Declaration Lines" requirement updated accordingly

## Approach

**Option C (Hybrid)** from exploration:
- Add `canvas_block` rule with literal string matching for `'canvas.before'`, `'canvas.after'`, `'canvas'` (ordered most-specific first)
- Add `_canvas_atom` rule for no-body instructions (`Clear`, `PushMatrix`, `PopMatrix`)
- Reuse `widget_declaration` for graphic instructions with bodies (Color:, Rectangle:, etc.) — they are structurally identical
- Add `canvas_block` to the `_declaration` choice in `grammar.js`
- No scanner changes — indent tracking already correct
- Tree-sitter's GLR resolves `'canvas'` literal over `identifier` in choice contexts

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `grammar.js` | Modified | Add `canvas_block`, `_canvas_atom`, update `_declaration` |
| `test/corpus/canvas.txt` | New | Corpus tests for all three canvas forms and no-body instructions |
| `src/scanner.c` | None | No scanner changes needed |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `canvas` as widget name | Low | No real-world kivy code uses "canvas" as widget name; acceptable tradeoff |
| Incomplete no-body list | Low | Start with 3 confirmed standard instructions; add more as discovered |
| `_canvas_header` order | Low | Order `'canvas.before'`, `'canvas.after'`, `'canvas'` — most specific first |

## Rollback Plan

Revert `canvas_block` and `_canvas_atom` grammar additions, remove `canvas_block` from `_declaration`, delete `test/corpus/canvas.txt`. Restores to pre-change state with zero backwards-compatibility risk.

## Dependencies

None — standalone grammar.js change.

## Success Criteria

- [ ] All three canvas forms parse without ERROR: `canvas:`, `canvas.before:`, `canvas.after:`
- [ ] No-body instructions (`Clear`, `PushMatrix`, `PopMatrix`) parse without ERROR inside canvas blocks
- [ ] All 37 existing corpus tests pass unchanged
- [ ] Canvas content reuses existing `widget_declaration`, `property`, `event_binding` nodes for instruction bodies
