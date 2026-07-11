# Design: Canvas Instruction Node

## Technical Approach

Pure grammar restructuring — no scanner changes. Replace the ad-hoc `_canvas_atom` rule and `widget_declaration` reuse inside `canvas_block` with a dedicated `canvas_instruction` named node. Remove `canvas_block` from `_declaration` to prevent nesting. Update 6 corpus test S-expressions.

## Architecture Decisions

| Decision | Options | Tradeoffs | Choice |
|----------|---------|-----------|--------|
| **Public vs private** | Named `canvas_instruction` vs anonymous `_canvas_instruction` | Named enables tooling queries (tree-sitter CLI, LSP) at no cost; anonymous hides canvas structure | **Named** |
| **Instruction name scope** | Generic `identifier` vs enumerated list | Kivy accepts any identifier; enumeration adds maintenance with no parsing benefit | **Generic `identifier`** |
| **Body content** | Full `_declaration` vs restricted to `property` + `comment` | Full allows invalid nesting (event_binding, id_declaration, widget_declaration); restricted matches Kivy runtime | **Restricted** |
| **Nesting prevention** | Remove `canvas_block` from `_declaration` vs runtime validation | Grammar-level prevention is cheaper and catches errors at parse time | **Remove from `_declaration`** |

## Grammar Changes

Add after `_canvas_header` (replacing `_canvas_atom`):

```javascript
canvas_instruction: $ => choice(
  seq(field('name', $.identifier), ':', choice(
    $._newline,
    seq($._indent, repeat(choice($.property, $.comment)), $._dedent),
  )),
  seq(field('name', $.identifier), $._newline),
),
```

Modify `canvas_block` body from `choice($._declaration, $._canvas_atom)` to `choice($.comment, $.canvas_instruction)`.

Remove `_canvas_atom` rule entirely.

Remove `$.canvas_block` from `_declaration` choice.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `grammar.js` | Modify | Add `canvas_instruction`, replace canvas_block body, delete `_canvas_atom`, remove from `_declaration` |
| `test/corpus/canvas.txt` | Modify | Update 6 S-expressions: `widget_declaration` → `canvas_instruction`, `_canvas_atom` content → `canvas_instruction` |

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Corpus | 6 canvas tests | Update S-expression expectations, run `tree-sitter test` |
| Corpus | 37 non-canvas tests | Verify no regressions — all pass unchanged |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

No migration required. Single commit, zero external dependencies.

## Open Questions

None.
