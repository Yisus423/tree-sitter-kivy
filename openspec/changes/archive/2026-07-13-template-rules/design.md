# Design: Template Rules for kvlang

## Technical Approach

Add `template_rule` to grammar.js as a new top-level rule under `_rule`, mirroring `class_rule`'s structure but using `[...]` brackets and requiring a name (no `@Base`-only form). Reuses `_rule_body` directly. No scanner changes — `[`/`]` are single-line anonymous tokens consumed entirely in grammar.js. Spec scenarios covered: bare name, name+base, name+multi-base, body variants, error cases.

## Architecture Decisions

### Decision: `template_entry` sub-rule vs reuse `class_entry`

| Option | Tradeoff | Decision |
|--------|----------|----------|
| A — Reuse `class_entry` | DRY but `class_entry` allows `@Base`-only (valid for `<>`, invalid for `[]`) | ❌ |
| B — Dedicated `template_entry` | Small duplication, but enforces name-required semantics at grammar level | ✅ |
| C — Inline in `template_rule` | Fewest nodes, but no named sub-rule for queries, inconsistent with `class_rule` | ❌ |

**Rationale**: `template_entry` is the first branch of `class_entry` minus the `@Base`-only form. This enforces at grammar level that `[@Button]:` yields ERROR (per spec). The minimal duplication is worth the correctness guarantee and query consistency with `class_rule`.

### Decision: Named `template_entry` vs anonymous fields

**Choice**: Named rule `template_entry` producing `(template_entry)` nodes in the CST.
**Rationale**: Mirrors `class_entry` pattern exactly. Enables tree-sitter queries like `(template_rule (template_entry name: (identifier)))`. The cost is one extra rule with no conflicts.

## Data Flow

```
source_file
  └── _rule (choice)
        ├── root_rule
        ├── class_rule
        └── template_rule  ← NEW
              ├── '[' (anonymous)
              ├── template_entry  ← NEW
              │     ├── name: identifier  (required)
              │     └── base: identifier  (optional, repeatable via '+')
              ├── ']' (anonymous)
              ├── ':' (anonymous)
              └── _rule_body (optional, reused)
                    └── _declaration* / _newline
```

## Grammar Changes

```diff
 _rule: $ => choice(
   $.root_rule,
   $.class_rule,
+  $.template_rule,
 ),

+template_entry: $ => seq(
+  field('name', $.identifier),
+  optional(seq('@', field('base', $.identifier),
+    repeat(seq('+', field('base', $.identifier))))),
+),
+
+template_rule: $ => seq(
+  '[',
+  $.template_entry,
+  ']',
+  ':',
+  optional($._rule_body),
+),
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `grammar.js` | Modify | Add `template_entry`, `template_rule` rules; add `$.template_rule` to `_rule` choice |
| `src/parser.c` | Modify | Regenerated via `tree-sitter generate` (no manual edits) |
| `test/corpus/template_rules.txt` | Create | Corpus tests: `[Name]:`, `[Name@Base]:`, `[Name@B1+B2]:`, body, empty brackets ERROR, `[@Button]:` ERROR |

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Integration | Template rule header variants | Corpus: `[Name]:` → `(template_rule (template_entry name: (identifier)))` |
| Integration | Template with base(s) | Corpus: `[Custom@Button]:` → multi-base template with `base:` fields |
| Integration | Template rule body | Corpus: template with properties, children, no-body |
| Integration | Error cases | Corpus: `[]:`, `[@Button]:` → ERROR nodes |
| Regression | Existing syntax | Run `tree-sitter test` — all existing corpus tests must pass unchanged |

## Conflict Analysis

No conflict declarations needed. `[` in `template_rule` vs `[` in `list_value` occupy disjoint syntactic contexts: level-0 `_rule` vs inside `property_value`. The LR parser resolves by stack state. `]` is only used as `list_value` terminator (inside `property_value`), not at level 0 — no ambiguity.

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

No migration required. Pure additive grammar rule — existing `.kv` files parse identically. Run `tree-sitter generate && tree-sitter test` to validate.

## Open Questions

None.
