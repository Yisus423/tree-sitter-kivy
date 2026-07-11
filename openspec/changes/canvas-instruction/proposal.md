# Proposal: canvas-instruction

## Intent

Replace ad-hoc `_canvas_atom` + `widget_declaration` reuse with a proper `canvas_instruction` named node, enabling tooling to distinguish canvas instructions from widget declarations in the CST. Also prevents canvas block nesting, which Kivy does not support.

## Scope

### In Scope
- `canvas_instruction` as named node with two variants: body-ful (`identifier:`) and body-less (`identifier` + newline)
- `canvas_block` body restricted to `canvas_instruction` and `comment` only
- Remove canvas nesting — drop `canvas_block` from `_declaration`
- Remove `_canvas_atom` rule entirely
- Update 6 canvas corpus test S-expression expectations

### Out of Scope
- Formatting/linting queries for canvas instructions
- Enumerated instruction name validation (generic `identifier` is intentional)

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `kvlang-canvas-blocks`: Replace `_canvas_atom` + `widget_declaration` reuse with dedicated `canvas_instruction` node. Remove `canvas_block` from `_declaration`. Restrict canvas body content to `property`/`comment` only. Needs a delta spec.

## Approach

Pure grammar restructuring — no scanner changes. Create `canvas_instruction` as a public named rule with two alternatives:
- Body-ful: `identifier ':'` + body of `repeat(choice($.property, $.comment))`
- Body-less (atoms): `identifier` + `$._newline`

Replace `choice($._declaration, $._canvas_atom)` in `canvas_block` with `choice($.comment, $.canvas_instruction)`. Remove `canvas_block` from `_declaration`. Delete `_canvas_atom` rule.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `grammar.js` lines 93-116 | Modified | Replace `_canvas_atom` + `_declaration` reuse with `canvas_instruction`, remove nesting |
| `test/corpus/canvas.txt` | Modified | Update 6 S-expression expectations: `widget_declaration` → `canvas_instruction` |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Existing .kv files use event_binding/id_declaration inside canvas | Low | Kivy runtime doesn't allow this — safe grammar restriction |
| Test corpus mismatch from wrong expectations | Low | Caught by `tree-sitter test` before commit |
| Non-canvas tests affected by `_declaration` change | Low | All 37 non-canvas tests use `widget_declaration`, not `canvas_block` |

## Rollback Plan

`git checkout HEAD -- grammar.js test/corpus/canvas.txt` — single file revert, zero external dependencies, no migration needed.

## Dependencies

None.

## Success Criteria

- [ ] `tree-sitter test` passes (all 37+ existing tests + 6 updated canvas expectations)
- [ ] `canvas_instruction` node appears in CST for `Color:`, `Rectangle:`, `Line:`, `Ellipse:`, etc.
- [ ] `canvas_block` no longer appears inside `widget_declaration` parse trees
- [ ] `canvas.before:` and `canvas.after:` produce identical structure to `canvas:`
