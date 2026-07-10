## Exploration: global-and-negated-class-rules

### Current State

The grammar in `grammar.js` defines `class_rule` as:

```js
class_rule: $ => seq(
    '<',
    field('name', optional($.identifier)),
    optional(seq('@', field('base', $.identifier),
        repeat(seq('+', field('base', $.identifier))))),
    '>',
    ':',
    optional($._rule_body),
),
```

Currently supported:
- `<Name>:` — standard class rule with `name` field
- `<Name@Base>:` — dynamic class with `name` + `base` field(s)
- `<@Button>:` — missing-name dynamic (parses, `base` present, no `name`)
- `<>:` — does NOT parse (identifier regex `/[a-zA-Z_]\w*/` doesn't match `>`)
- `<-Name>:` — does NOT parse (`-` is not in identifier regex; produces ERROR)

The `_rule` production (line 57) dispatches:
```js
_rule: $ => choice($.root_rule, $.class_rule),
```

The spec (`openspec/specs/kvlang-core-syntax/spec.md`, Requirement "Rule Headers") only covers:
- Root rules (`Name:`)
- Class rules with identifiers (`<Name>:` and `<Name@Base+...>:`)

No mention of global rules (`<>:`) or negated rules (`<-Name>:`).

### Affected Areas

| File | Why affected |
|------|-------------|
| `grammar.js` | Core change — must extend `class_rule` production with choice between negated, standard, and empty (global) forms |
| `test/corpus/core-syntax.txt` | Must add test cases for `<>:`, `<-Name>:`, both with optional bodies |
| `openspec/specs/kvlang-core-syntax/spec.md` | Must update Rule Headers requirement to include global and negated class rules |
| `src/scanner.c` | **Not affected** — `-` is a regular inline character consumed by tree-sitter's internal lexer; the external scanner only handles newlines, indentation, and `#:` directives |

### What Kivy's kv Language Says

From Kivy docs and community conventions:

| Pattern | Example | Meaning |
|---------|---------|---------|
| Simple class rule | `<MyButton>:` | Rule applies to `MyButton` widgets only |
| Dynamic class | `<Custom@Button>:` | Creates new class `Custom` inheriting from `Button` |
| **Global rule** | `<>:` | Rule applies to ALL widget classes |
| **Negated rule** | `<-MyButton>:` | Rule applies to ALL widgets EXCEPT `MyButton` |

Negation is exclusive — `<-Button+Label>:` is NOT valid (only one negated name).
`<-Name@Base>:` is NOT valid — `@` (dynamic base) conflicts with negation semantics.

### Grammar Design

The `class_rule` production must be restructured to accept three patterns between `<` and `>`:

1. **`-Name`** — negated rule: `seq('-', field('negated', $.identifier))`
2. **`[Name][@Base[+Base...]]`** — standard/dynamic rule (existing behavior)
3. **(empty)** — global rule `<>`

Using `choice()` inside the `<`...`>` section with appropriate `optional()` wrappers:

```js
class_rule: $ => seq(
    '<',
    choice(
        // <-Name> — negated rule, one class only
        seq('-', field('negated', $.identifier)),
        // <Name>, <Name@Base>, <Name@Base1+Base2>, <@Base>
        seq(
            optional(field('name', $.identifier)),
            optional(seq('@', field('base', $.identifier),
                repeat(seq('+', field('base', $.identifier))))),
        ),
    ),
    '>',
    ':',
    optional($._rule_body),
),
```

#### How each case resolves:

| Input | Path | Result |
|-------|------|--------|
| `<>:` | Branch 1 skipped (no `-`), Branch 2: both optionals empty | `(class_rule)` — no fields |
| `<-Name>:` | Branch 1 matches `-Name` | `(class_rule negated: (identifier))` |
| `<Name>:` | Branch 1 skipped (no `-`), Branch 2: name matches | `(class_rule name: (identifier))` |
| `<Name@Base>:` | Branch 2: name + `@` + base | `(class_rule name: (identifier) base: (identifier))` |
| `<@Button>:` | Branch 2: name empty, `@` + base matches | `(class_rule base: (identifier))` (preserves existing) |
| `<-Name@Base>:` | Branch 1 matches `-Name`, then `>` expected but `@` found | **ERROR** (desired — `@` invalid after negation) |
| `<-->:` | Neither branch matches properly | **ERROR** |

#### Why `choice()` with a 2nd always-matching branch works

The second branch has only optional components, so it always matches at minimum empty input. This means:
- `<>:` → second branch matches empty → clean parse with no fields
- Standard rules → second branch matches with optional fields filled
- Negated rules → first branch matches preferentially (choice left-to-right)
- Invalid combos (`-Name@Base`) → first branch partially matches, then `>` fails → ERROR

### No scanner changes needed

The `-` character is not part of the external scanner's domain. The scanner (`scanner.c`) only handles:
- `NEWLINE`, `INDENT`, `DEDENT` (indentation tracking)
- `BREAK` (blank lines between top-level rules)
- `DIRECTIVE_START` (`#:` prefix)

All content characters between `<` and `>` are handled by tree-sitter's internal lexer based on `grammar.js` patterns. The identifier regex `/[a-zA-Z_]\w*/` doesn't include `-`, so `-` will be treated as a literal character match by `'-'` in the grammar.

### No conflict with property values

Property values use `token.immediate(/[^\n\r]+/)` — an opaque token consuming everything to end of line. Any `-` in arithmetic expressions (`x: width - 20`) is swallowed by the opaque `property_value` token. Since this rule change only affects content between `<` and `>` at the TOP of a rule (parsed positionally before `>`), there's zero ambiguity with property values.

### Backward Compatibility

**Fully backward compatible.** All existing `<Name>:` and `<Name@Base+...>:` parses produce identical CST trees. Existing consumers that query `class_rule` will see:
- New `negated` field (absent for existing parses — additive)
- No `name` field for `<>:` (consistent with how missing names work today for `<@Button>:`)

Zero changes to existing tree structures.

### Approaches

Only one sensible approach exists here — extend `class_rule` with a `choice()` inside the angle brackets. Two alternatives were considered:

1. **A: Extend `class_rule` in-place (recommended)** — Restructure the rule to wrap `<`...`>` content in a `choice()`:
   - Pros: Single rule type, zero CST change for existing parses, naturally handles all three cases, `<-Name@Base>:` produces ERROR automatically
   - Cons: Slightly more complex grammar rule (but still readable)
   - Effort: **Low** (~5 lines grammar change + tests + spec update)

2. **B: Separate `global_rule` and `negated_rule` productions** — Create new named rules alongside `class_rule`:
   ```
   _rule: $ => choice($.root_rule, $.class_rule, $.global_rule, $.negated_rule),
   ```
   - Pros: Clear semantic separation per node type
   - Cons: Code duplication, three separate seq() productions with shared structure, harder to query "all class-like rules", more CST complexity, increases GLR branching
   - Effort: **Low** (~30 lines grammar change + tests)
   - **Rejected** — duplicates indentation/body handling, makes downstream queries harder, no real benefit

### Recommendation

**Approach A — Extend `class_rule` in-place with `choice()` inside angle brackets.**

Rationale:
1. A global rule and a negated rule ARE class rules semantically — they go in `<...>:` form
2. Zero backward compatibility risk — existing `<Name>:` and `<Name@Base>:` trees are unchanged
3. Lower maintenance — one rule handles all class-like patterns
4. Clean error handling for invalid combos (`<-Name@Base>:`) emerges naturally from the grammar structure
5. Downstream tooling uses a single query: `(class_rule)` for all class rules, with optional `negated:` or `name:` fields to distinguish cases

### Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| **Regression on existing `<@Button>:` parse** | Low | Verified: Branch B's `optional(field('name', $.identifier))` matches same behavior as current `field('name', optional($.identifier))` |
| **GLR ambiguity between branches for `<Name>:`** | None | Branch 1 starts with `-`, Branch 2 starts with `optional(identifier)`. Identifier doesn't match `-`, so Branch 2 skips name. For `<Name>:`, Branch 1 fails (no `-`), Branch 2 takes name. No ambiguity. |
| **`-` conflict with subtraction in properties** | None | `property_value` uses opaque `token.immediate(/[^\n\r]+/)` |

### Ready for Proposal

**Yes.** The approach is clear, effort is Low, no scanner changes needed, fully backward compatible. The orchestrator should proceed to `sdd-propose`.

Key points for the orchestrator:
1. One `choice()` inside `class_rule` handles `<>:`, `<-Name>:`, `<Name>:`, and `<Name@Base>:` — no new rules needed
2. Scanner is untouched — `-` is handled by internal lexer
3. The grammar naturally rejects `<-Name@Base>:` (produces ERROR) since `@` can't follow a negated name
4. `<>:` produces `(class_rule)` with no fields — clean, minimal
5. All existing class_rule tests continue to pass unchanged
6. Spec update needed for Rule Headers requirement — add scenarios for global and negated rules
