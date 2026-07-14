# Design: Property Value Fix

## Technical Approach

Two targeted changes in `grammar.js` — no scanner, no query changes, no new dependencies:

1. **Rename** `_raw_value` → `raw_value` (remove `_` prefix to make it a named, queryable node)
2. **Restructure** `property_value` from `seq(choice(...), optional(raw_value))` to `choice(seq(choice(...), optional(raw_value)), raw_value)` so `(`-starting Python expressions fall to the catch-all instead of ERROR

Then `tree-sitter generate` to rebuild `src/parser.c`, and add one corpus test case.

## Architecture Decisions

| Decision | Options | Choice | Rationale |
|----------|---------|--------|-----------|
| Catch-all position in choice | `choice(typed-seq, catch-all)` vs inline error recovery | `choice(typed-seq, catch-all)` first | Tree-sitter GLR tries alternatives in order; typed seq with optional raw_value suffix matches `dotted_ref * 0.5` first, bare `raw_value` catches `(root.x + root.y)`. GLR backtracks fully from failed alternatives, no ambiguity risk. |
| Catch-all as `raw_value` or new rule | Reuse renamed `raw_value` vs new `_expr` rule | Reuse `raw_value` | Same semantics — captures rest of line as raw text. No need for a distinct node type; both cases produce the same kind of node. |
| Grammar rule vs token predicate | Grammar-level `choice` vs scanner changes | Grammar-level `choice` | `_raw_value`/`raw_value` is already a `token()` — the catch-all is a structural grammar choice, not a lexer concern. No scanner changes needed. |

## Data Flow

```
Input line:  size_hint: (root.x + root.y)

property_value evaluation (choice order):
  1. seq(choice(string, number, ..., tuple, ...), optional(raw_value))
     → tuple tries '(', matches root.x, expects ')' or ',' → finds '+' → FAILS
     → backtrack; all typed alternatives fail
  2. $.raw_value
     → token(/[^\n\r]+/) → matches "(root.x + root.y)" → SUCCESS

CST:
(property_value (raw_value))
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `grammar.js` | Modify | Rename `_raw_value`→`raw_value`; restructure `property_value` to `choice()` |
| `src/parser.c` | Regenerate | Auto-generated via `tree-sitter generate` — no manual edits |
| `test/corpus/core-syntax.txt` | Modify | Add corpus test case for `size_hint: (root.x + root.y)` → `raw_value` |

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Corpus (regression) | All existing property scenarios | `tree-sitter test` — must pass cleanly |
| Corpus (new) | `size_hint: (root.x + root.y)` | Add test case expecting `(property_value (raw_value))`, no ERROR |
| Corpus (edge) | `font_size: self.parent.width * 0.5` | Existing test — `dotted_ref` must still match first, `raw_value` suffix catches ` * 0.5` |
| Corpus (guarded) | `size: (100, 200)` | Existing test — `tuple` must still take priority over catch-all |

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| GLR ambiguity between typed-seq and catch-all | Very Low | Parse tree change | First-match semantics — typed values always win when they succeed; GLR backtracks on failure. `raw_value` catch-all only triggers when no typed prefix matches. |
| `optional(raw_value)` in first choice consumes rest of line when typed prefix matches | None by design | — | This is the existing behavior — `dotted_ref` + `raw_value` suffix is intentional |

## Migration / Rollout

No migration required. `src/parser.c` is regenerated; consumers see the updated CST with named `raw_value` nodes after rebuild.
