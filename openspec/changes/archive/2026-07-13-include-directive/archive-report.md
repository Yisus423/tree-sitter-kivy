# Archive Report: include-directive

**Change**: include-directive
**Archived at**: 2026-07-13
**Archive path**: `openspec/changes/archive/2026-07-13-include-directive/`
**Artifact Store Mode**: hybrid (Engram + filesystem)

## Gates

| Gate | Status | Notes |
|------|--------|-------|
| Review Gate | ✅ N/A | Orchestrator-launched archive with verified verdict |
| Task Completion Gate | ✅ Pass | 9/9 tasks marked [x] in tasks.md |
| Verification Gate | ✅ Pass | Verdict: PASS — 0 CRITICAL, 0 WARNING |
| Destructive Merge Check | ✅ Pass | Non-destructive: 1 added requirement + 1 modified requirement |

## Specs Synced

| Domain | Action | Details |
|--------|--------|---------|
| kvlang-directives | Updated | 1 ADDED (`#:include` Directive with 5 scenarios), 1 MODIFIED (Malformed Directives — added `include` to known keywords + `#:include` without path scenario) |

## Archive Contents

| Artifact | Status |
|----------|--------|
| proposal.md | ✅ |
| exploration.md | ✅ (optional — carried over from sdd-explore) |
| specs/kvlang-directives/spec.md | ✅ (delta spec) |
| design.md | ✅ |
| tasks.md | ✅ (9/9 tasks complete) |
| verify-report.md | ✅ |
| archive-report.md | ✅ (this file) |

## Engram Observation IDs (Traceability)

| Artifact | Observation ID |
|----------|---------------|
| sdd/include-directive/proposal | #914 |
| sdd/include-directive/spec | #915 |
| sdd/include-directive/design | #916 |
| sdd/include-directive/tasks | #917 |
| sdd/include-directive/apply-progress | #918 |
| sdd/include-directive/verify-report | #919 |
| sdd/include-directive/archive-report | (this observation) |

## Source of Truth Updated

The following main spec now reflects the new behavior:
- `openspec/specs/kvlang-directives/spec.md`

### Merge Summary

**Requirement: `#:include` Directive** (ADDED)
- Added after `#:kivy` Directive section
- Format: `#:include <path>` or `#:include force <path>`
- `force` token is NOT a structured field — stays in raw `directive_value`
- 5 scenarios covering: basic path, force keyword, nested path, mixed directives, missing path (ERROR)

**Requirement: Malformed Directives** (MODIFIED)
- Known keywords updated from (`import`, `set`, `kivy`) to (`import`, `set`, `kivy`, or `include`)
- Added: `An #:include without a path MUST produce an ERROR node`
- Added scenario: `#:include` with no path → ERROR node

### Requirements Preserved (Unchanged)

- File-Level Directive Positioning ✅
- `#:import` Directive ✅
- `#:set` Directive ✅
- `#:kivy` Directive ✅
- Comment Preservation ✅
- Backward Compatibility ✅
- Edge Cases ✅

## SDD Cycle Complete

The `include-directive` change has been fully planned, implemented, verified, and archived.
