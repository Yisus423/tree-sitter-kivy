# Design: Global and Negated Class Rules

## Technical Approach

Extend `class_rule` in `grammar.js` with a `choice()` between two branches inside the angle brackets:

- **Branch 1** (`<-Name>`): `seq('-', field('negated', $.identifier))`
- **Branch 2** (`<Name>`, `<Name@Base>`, `<>`): existing pattern wrapped with `optional(name)` so the name field can be absent for `<>:`

No scanner changes. No new named rules. The `-` prefix is a literal token handled by the internal lexer. Backward compatible — existing CST trees are identical because Branch 1 never matches existing valid input (no valid class rule starts with `-`).

## Architecture Decisions

| Decision | Option | Tradeoff | Choice |
|----------|--------|----------|--------|
| Branch ordering in `choice()` | Negated first vs standard first | Negated first avoids ambiguity: `-` literal is a firm discriminator; standard branch without leading literal could partially match negated input | Negated first |
| `name` field optional vs presence-check | `optional($.identifier)` vs `$.identifier` with conditional | Making `name` optional lets `<>:` produce a tree with no `name` field — semantically clear vs requiring a different production | `optional($.identifier)` — reuses existing field name; absence of `name` signals global |
| `negated` name cardinality | Single `$.identifier` vs `repeat1($.identifier)` | Kivy kvlang only supports single negated name; `repeat1` would accept invalid `<-A+B>:` | Single `$.identifier` |
| `@` with global/negated | Excluded vs allowed (yields ERROR) | User confirmed: `<>:` has no name, cannot have `@`. `<-Name@Base>:` — Branch 1 consumes `-Name`, then expects `>` but finds `@` → naturally ERROR | Excluded via grammar structure — no explicit error production needed |

## Data Flow

```
class_rule production:

    '<' ──┬── choice() ──┬── seq('-', identifier) ──→ negated field
          │              │
          │              └── seq(optional(identifier), optional('@' + bases))
          │                                      │                 │
          │                            name field (or absent)   base fields
          │
    '>' ──→ ':' ──→ optional(_rule_body)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `grammar.js` | Modify | Replace `class_rule` production (~9 lines → ~12 lines); wrap content in `choice()` with negated branch |
| `test/corpus/core-syntax.txt` | Modify | Add 5 new test cases (see Testing Strategy) |

## Interfaces / Contracts

No new CST node types. Existing `class_rule` node gains an optional `negated` field (type: `identifier`). The `name` field is now optional — absent for `<>:`.

```
// Existing: name always present (optional in grammar, but semantically always there)
(class_rule name: (identifier))

// After change — same tree for existing inputs:
(class_rule name: (identifier))

// New — global rule (no name, no negated):
(class_rule)

// New — negated rule:
(class_rule negated: (identifier))
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Regression | All existing corpus tests | Run `tree-sitter test` — every existing CST tree MUST be identical |
| Parsing | `<>:` (no body) | Expected: `(source_file (class_rule))` — no name field |
| Parsing | `<>:` with body | Expected: `class_rule` with child declarations |
| Parsing | `<-Button>:` (no body) | Expected: `(class_rule negated: (identifier))` |
| Parsing | `<-Button>:` with body | Expected: `class_rule` with `negated` field + child declarations |
| Error | `<-Name@Base>:` | Expected: ERROR node — `@` after negation is invalid |

## Migration / Rollout

No migration required. Grammar-only change, fully backward compatible. Revert by reverting `class_rule` to its previous definition.

## Open Questions

None.
