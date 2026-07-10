# Archive Report

**Change**: property-value-parsing
**Archived**: 2026-07-10
**Previous location**: `openspec/changes/property-value-parsing/`
**Archive location**: `openspec/changes/archive/2026-07-10-property-value-parsing/`

## Change Summary

Structured property value parsing for the `kvlang-core-syntax` spec. Added typed child nodes (string, number, boolean, None, dotted_ref, tuple) for property values in the Kvlang grammar, replacing the previous flat `token.immediate(/[^\n\r]+/)` raw text approach.

## Verdict

**PASS** — All 6 tasks complete. 66/66 tests pass. No CRITICAL issues.

## Artifacts Preserved

| Artifact | Path |
|----------|------|
| Exploration | `openspec/changes/archive/2026-07-10-property-value-parsing/exploration.md` |
| Proposal | `openspec/changes/archive/2026-07-10-property-value-parsing/proposal.md` |
| Design | `openspec/changes/archive/2026-07-10-property-value-parsing/design.md` |
| Tasks | `openspec/changes/archive/2026-07-10-property-value-parsing/tasks.md` |
| Delta Spec | `openspec/changes/archive/2026-07-10-property-value-parsing/specs/kvlang-core-syntax/spec.md` |
| Apply Progress | `openspec/changes/archive/2026-07-10-property-value-parsing/apply-progress.md` |
| Verify Report | `openspec/changes/archive/2026-07-10-property-value-parsing/verify-report.md` |
| Archive Report | `openspec/changes/archive/2026-07-10-property-value-parsing/archive-report.md` |

## Delta Spec Merged

Delta spec merged into `openspec/specs/kvlang-core-syntax/spec.md`:

- **MODIFIED**: "Requirement: Declaration Lines" — updated description from `property (identifier: raw_text)` to `property (identifier: <property_value>)` with full typed value catalog, expanded scenario table from 8 to 18 rows covering all typed value categories.

All other requirements unchanged.

## Warnings for Future Work

- Duplicate `_tuple_elements` definitions in grammar.js (dead code)
- `dotted_ref` missing from `_typed_value` — cannot use dotted_ref inside tuples
- `event_binding` rule never matches (pre-existing limitation)
