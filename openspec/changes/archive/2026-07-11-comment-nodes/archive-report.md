# Archive Report: comment-nodes

**Date**: 2026-07-11
**Change**: comment-nodes
**Archive Location**: `openspec/changes/archive/2026-07-11-comment-nodes/`
**Mode**: hybrid (filesystem + Engram)

## Summary

The comment-nodes change added `(comment)` CST nodes to the tree-sitter-kivy parser. Previously, `#` lines were consumed entirely by the external scanner for indent tracking, losing comment content from the CST. This change:

1. Added a `comment` grammar rule (`token(seq('#', /[^\n]*/))`) registered as an extra token
2. Modified the external scanner at 5 sites to return `false` when encountering `#` instead of consuming the line
3. Updated corpus tests (core-syntax.txt, directives.txt) to expect `(comment)` nodes
4. Ran `tree-sitter generate` to regenerate parser artifacts

## Artifacts

| Artifact | Status | Path |
|----------|--------|------|
| proposal.md | ✅ | `openspec/changes/archive/2026-07-11-comment-nodes/proposal.md` |
| spec.md (delta) | ✅ | `openspec/changes/archive/2026-07-11-comment-nodes/spec.md` |
| design.md | ✅ | `openspec/changes/archive/2026-07-11-comment-nodes/design.md` |
| tasks.md | ✅ | `openspec/changes/archive/2026-07-11-comment-nodes/tasks.md` (8/8 tasks, reconciled) |
| verify-report.md | ✅ | `openspec/changes/archive/2026-07-11-comment-nodes/verify-report.md` |
| archive-report.md | ✅ | `openspec/changes/archive/2026-07-11-comment-nodes/archive-report.md` |

## Verification

- **Verdict**: PASS
- **Tests**: 80/80 passed (0 failed, 0 skipped)
- **Spec compliance**: 12/12 scenarios compliant across kvlang-core-syntax and kvlang-directives
- **Critical issues**: None
- **Warnings**: Design deviation (externals + explicit grammar rules vs extras as-designed) — functionally equivalent

## Spec Sync

The main spec files (`openspec/specs/kvlang-core-syntax/spec.md` and `openspec/specs/kvlang-directives/spec.md`) were **not modified** per explicit user instruction. The delta specs describe the changes but the base specs remain as-is for future delta comparisons. This is an intentional partial archive — the delta specs in the archive record what changed.

## Task Reconciliation

All 8 tasks were marked complete via archive-time reconciliation. The `verify-report.md` provides full evidence: 80/80 tests passing, 12/12 spec scenarios compliant, build passing, and all code changes verified. The stale checkboxes in the original `tasks.md` were a result of the apply phase completing without updating the task tracker.

## Change Impact

| File | Action |
|------|--------|
| `grammar.js` | Modified — added `comment` rule + externals entry |
| `src/scanner.c` | Modified — 5 sites updated to stop consuming `#` lines |
| `test/corpus/core-syntax.txt` | Modified — 4 expected trees updated with `(comment)` nodes |
| `test/corpus/directives.txt` | Modified — 1-2 expected trees updated with `(comment)` nodes |
| `src/parser.c` | Regenerated via `tree-sitter generate` |

## SDD Cycle Status

**Complete**. The change was planned, implemented, verified, and archived with no regressions.
