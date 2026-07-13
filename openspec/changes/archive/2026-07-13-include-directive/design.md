# Design: `#:include` Directive Support

## Technical Approach

Add an `include_directive` grammar rule following the exact pattern of `kivy_directive`: `_directive_start` → `'include'` keyword → `directive_value` field → `_newline`. Wire it into the existing `_directive` choice. The `force` keyword stays as raw text inside `directive_value` — no structured field. No scanner changes; `DIRECTIVE_START` + `NEWLINE` already handle the tokenization. Add corpus tests, regenerate the parser.

## Architecture Decisions

| Decision | Alternatives Considered | Rationale |
|----------|------------------------|-----------|
| `include_directive` rule: `seq(_directive_start, 'include', field('path', directive_value), _newline)` | Structured `force` boolean field (Approach B) | Follows `kivy_directive` pattern exactly. `force` semantics are a runtime concern, not parsing. Consistent with `#:kivy` which also has no sub-fields. |
| No scanner changes | Modify scanner to track `include`/`force` keywords | `DIRECTIVE_START` is already emitted for `#:` — the grammar's keyword match (`'include'`) handles it. Adding scanner logic would increase C code complexity for no benefit. |
| Use `.directive_value` (no new token) | New `path_value` token for paths-only | `directive_value` is `/[^\n\r]+/` — any non-newline content works. No need to introduce a new token type for the same regex. |

## Data Flow

```
Input: "#:include myfile.kv\n"
          │
Scanner: ─→ DIRECTIVE_START (consumes "#:")
          │
Grammar: ─→ matches 'include' keyword
          │
          ─→ directive_value matches " myfile.kv" (raw text, includes leading space)
          │
          ─→ _newline matches "\n"
          │
          └→ include_directive node (path: " myfile.kv") added to source_file
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `grammar.js` | Modify | Add `include_directive` rule (~3 lines) + add `$.include_directive` to `_directive` choice |
| `test/corpus/directives.txt` | Modify | Add 4 test cases: simple include, include with force, nested path, missing path (ERROR) |
| `openspec/changes/include-directive/specs/kvlang-directives/spec.md` | Modify | Already updated via sdd-spec — no additional delta needed |
| `src/parser.c` | Regenerate | `tree-sitter generate` — auto-generated from grammar.js |
| `src/grammar.json` | Regenerate | Auto-generated |
| `src/node-types.json` | Regenerate | Auto-generated |

## Interfaces / Contracts

```javascript
// grammar.js — new rule
include_directive: $ => seq(
  $._directive_start,
  'include',
  field('path', $.directive_value),
  $._newline,
),

// modified _directive choice
_directive: $ => choice(
  $.import_directive,
  $.set_directive,
  $.kivy_directive,
  $.include_directive,  // ← added
),
```

New CST node type: `include_directive` with single field `path` (`directive_value`). No new external tokens, no new scanner symbols.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Corpus | `#:include myfile.kv` | tree-sitter test — verify `include_directive` node with path `(directive_value)` |
| Corpus | `#:include force myfile.kv` | tree-sitter test — `"force myfile.kv"` in directive_value, no structured force field |
| Corpus | `#:include subdir/nested/file.kv` | tree-sitter test — path with directory separators |
| Corpus | `#:include` missing path | tree-sitter test — ERROR node for incomplete directive |
| Corpus | Mixed: `#:import`, `#:include`, `#:set` | tree-sitter test — all parse under source_file without ERROR |
| Regression | All existing 177 directive corpus lines | `tree-sitter test` — unchanged CST output, no regressions |

No unit tests needed — tree-sitter test corpus is the authoritative test for grammar correctness.

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

No migration required. Purely additive grammar change — new directive nodes only appear when `#:include` is encountered. Existing `.kv` files without `#:include` produce identical CST. Regenerate parser via `bun tree-sitter generate` (or `npx tree-sitter generate`).

## Open Questions

None.
