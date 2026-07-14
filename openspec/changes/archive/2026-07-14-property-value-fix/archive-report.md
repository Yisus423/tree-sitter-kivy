# Archive Report: property-value-fix

**Archived**: 2026-07-14
**Store Mode**: hybrid (OpenSpec + Engram)

## Cycle Status

| Step | Status |
|------|--------|
| Proposal | ✅ Done |
| Specs (delta) | ✅ Done |
| Design | ✅ Done |
| Tasks | ✅ Done (6/6) |
| Apply | ✅ Done |
| Verify | ✅ PASS |
| Review Gate | ✅ Pass (verify verdict: PASS, 103/103 tests, 0 blockers, 0 criticals) |

## Specs Synced

| Domain | Action | Details |
|--------|--------|---------|
| kvlang-core-syntax | Updated | 1 MODIFIED requirement (Declaration Lines): `_raw_value` renamed to `raw_value`; added `size_hint: (root.x + root.y)` → `raw_value` scenario |

### Merge Details

- **Requirement**: Declaration Lines
  - Updated "Previously:" note to include rename + catch-all information alongside original content
  - Updated `font_size: self.parent.width * 0.5` scenario: `_raw_value` → `raw_value`
  - Added new scenario: `size_hint: (root.x + root.y)` → `raw_value` child

## Archive Location

`openspec/changes/archive/2026-07-14-property-value-fix/`

### Archive Contents

| Artifact | Path | Status |
|----------|------|--------|
| Proposal | `openspec/changes/archive/2026-07-14-property-value-fix/proposal.md` | ✅ |
| Delta Specs | `openspec/changes/archive/2026-07-14-property-value-fix/specs/kvlang-core-syntax/spec.md` | ✅ |
| Design | `openspec/changes/archive/2026-07-14-property-value-fix/design.md` | ✅ |
| Tasks | `openspec/changes/archive/2026-07-14-property-value-fix/tasks.md` | ✅ (6/6) |
| Verify Report | `openspec/changes/archive/2026-07-14-property-value-fix/verify-report.md` | ✅ PASS |
| Archive Report | `openspec/changes/archive/2026-07-14-property-value-fix/archive-report.md` | ✅ |

## Verification

- [x] All 6 tasks marked `[x]` — no stale unchecked tasks
- [x] Verify verdict: **PASS** — 103/103 tests, 0 blockers, 0 criticals
- [x] Delta spec merged into main spec at `openspec/specs/kvlang-core-syntax/spec.md`
- [x] Change folder moved to archive: `openspec/changes/archive/2026-07-14-property-value-fix/`
- [x] Active changes directory no longer contains this change

## Source of Truth Updated

`openspec/specs/kvlang-core-syntax/spec.md` — Declaration Lines requirement now reflects:
- Named `raw_value` node instead of hidden `_raw_value`
- `(`-starting expressions parse as `raw_value` catch-all instead of ERROR

## SDD Cycle Complete

The change `property-value-fix` has been fully planned, implemented, verified, and archived.
