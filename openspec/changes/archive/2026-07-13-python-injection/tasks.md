# Tasks: Python Injection in Property Values

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~4 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | auto-forecast |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

## Phase 1: Injection Query

- [x] 1.1 Create `queries/injections.scm` — single-pattern injection mapping `property_value` → Python with `include-children`
- [x] 1.2 Add `"injections": ["queries/injections.scm"]` to kivy grammar entry in `tree-sitter.json`
- [x] 1.3 Run `tree-sitter test` to confirm zero regression (no grammar changes)
- [x] 1.4 Run `tree-sitter build --wasm` to confirm build succeeds with new query file
