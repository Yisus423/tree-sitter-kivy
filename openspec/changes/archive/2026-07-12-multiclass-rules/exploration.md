## Exploration: Multiclass Rules

### Current State

The `class_rule` in `grammar.js` (lines 73-86) handles a SINGLE entry inside `<...>`:

```javascript
class_rule: $ => seq(
  '<',
  choice(
    seq('-', field('negated', $.identifier)),                           // <-Button>
    seq(
      field('name', optional($.identifier)),                            // <MyButton> or <>
      optional(seq('@', field('base', $.identifier),                    // <Custom@Base>
        repeat(seq('+', field('base', $.identifier))))),                // <Custom@Base1+Base2>
    ),
  ),
  '>',
  ':',
  optional($._rule_body),
),
```

The `choice` has exactly two alternatives: **negated** (`-Name`) and **named** (`Name`, `Name@Base`, `Name@Base1+Base2`, or empty for `<>:`).

No comma-separated multi-class support exists. `<ButtonA, ButtonB>:` currently fails to parse — the parser sees `ButtonA` as the name, then encounters `,` which doesn't match `>` or `@` or `+`, causing a parse error or unexpected token.

#### Current CST tree shapes (from corpus tests)

| Input | CST |
|-------|-----|
| `<MyButton>:` | `(class_rule name: (identifier))` |
| `<>:` | `(class_rule)` |
| `<-Button>:` | `(class_rule negated: (identifier))` |
| `<CustomButton@Button>:` | `(class_rule name: (identifier) base: (identifier))` |
| `<NewWidget@Behavior+Label>:` | `(class_rule name: (identifier) base: (identifier) base: (identifier))` |
| `<@Button>:` | `(class_rule base: (identifier))` — dynamic with missing name |
| `<-Name@Base>:` | `(class_rule (ERROR (identifier)) base: (identifier))` — negated + base is an error |

### Affected Areas

- **`grammar.js` (lines 73-86)** — `class_rule` definition must be extended to accept comma-separated entries, or refactored into a reusable `class_entry` rule
- **`test/corpus/core-syntax.txt`** — All existing class rule tests will need updated expected CSTs (if CST changes). New test cases for multi-class rules must be added.
- **`src/parser.c`** — Regenerated automatically by `tree-sitter generate` (no manual change)
- **`src/grammar.json`** — Regenerated
- **`src/node-types.json`** — Regenerated

### Scanner Analysis

The external scanner (436 lines of C) has **NO special handling** for `,`, `<`, or `>` characters. These pass through to the internal lexer as regular characters. The scanner only handles:
- INDENT / DEDENT / NEWLINE tokens
- `#:` directive detection
- `#` comment lines
- Blank line skipping (BREAK token)

This means commas inside `<...>` are handled entirely by `grammar.js` — the scanner won't interfere. There is **no risk** of the scanner consuming or misclassifying commas.

### Existing Comma Usage in grammar.js

Comma `,` is already used in three contexts (lines 206-240):
- `_tuple_elements`: inside `()` — `(1, 2, 3)`
- `_list_elements`: inside `[]` — `[1, 2, 3]`
- `_dict_entries`: inside `{}` — `{'a': 1, 'b': 2}`

All three are inside matched bracket pairs and are explicitly listed in the `conflicts` array (line 18-22). Comma usage inside `<...>` is a **completely distinct context** — there is no overlap with tuple, list, or dict parsing. **No new conflict declarations are needed.**

### Kivy's Actual Multi-Class Syntax

From Kivy's kvlang (confirmed by the exploration doc in `openspec/exploration/kvlang-grammar-research/exploration.md`, section 2):

```kv
# Multi-class rule — comma-separated names share a body
<ButtonA, ButtonB>:
    font_size: '18sp'
    size_hint: (0.3, 0.1)
```

Kivy's parser (Python `kivy/lang/parser.py`) processes multi-class rules by **splitting on commas first**, then processing each entry independently. This means each entry is a full selector:

| Pattern | Valid? | Notes |
|---------|--------|-------|
| `<A, B>:` | ✅ Yes | Most common form |
| `<A@Base, B>:` | ✅ Yes | Each entry independently processed |
| `<A@Base, B@Base2>:` | ✅ Yes | Each dynamic class is independent |
| `<A, B@Base>:` | ✅ Yes | Mixed plain and dynamic |
| `<A, -B>:` | ❌ Unusual | Per-entry negated is semantically odd but could be supported |
| `<A, B, C>:` | ✅ Yes | Three or more classes |

Each entry in the comma-separated list is a complete class selector — it can include `@Base` (dynamic class inheritance). The body is shared across all entries.

### Approaches

#### 1. **Approach B (recommended): Named `class_entry` rule — refactored with explicit grouping**

Extract the inner entry logic into a new **named** `class_entry` rule, then compose `class_rule` as a list of entries separated by commas:

```javascript
class_entry: $ => choice(
  seq('-', field('negated', $.identifier)),
  seq(
    field('name', optional($.identifier)),
    optional(seq('@', field('base', $.identifier),
      repeat(seq('+', field('base', $.identifier))))),
  ),
),

class_rule: $ => seq(
  '<',
  $.class_entry,
  repeat(seq(',', $.class_entry)),
  '>',
  ':',
  optional($._rule_body),
),
```

New CST shapes:

| Input | CST |
|-------|-----|
| `<MyButton>:` | `(class_rule (class_entry name: (identifier)))` |
| `<ButtonA, ButtonB>:` | `(class_rule (class_entry name: (identifier)) (class_entry name: (identifier)))` |
| `<ButtonA@Base, LabelB@Label>:` | `(class_rule (class_entry name: (identifier) base: (identifier)) (class_entry name: (identifier) base: (identifier)))` |

- **Pros**: Cleanest CST with explicit entry grouping. Supports ALL selector types per entry (named, negated, dynamic, empty/global). No positional ambiguity. Easy for tree-sitter queries (`(class_entry) @entry`). Very maintainable.
- **Cons**: **Breaks all ~10 existing class rule tests** — every expected CST must wrap entries in `(class_entry ...)`. Single entry case adds one wrapper level.
- **Effort**: Medium

#### 2. **Approach A: Minimal inline extension — add comma-repeat to existing named branch**

Keep the existing structure and add a `repeat(seq(',', ...))` for additional names:

```javascript
class_rule: $ => seq(
  '<',
  choice(
    seq('-', field('negated', $.identifier)),
    seq(
      field('name', optional($.identifier)),
      optional(seq('@', field('base', $.identifier),
        repeat(seq('+', field('base', $.identifier))))),
      repeat(seq(',', field('name', $.identifier))),            // ADDED
    ),
  ),
  '>',
  ':',
  optional($._rule_body),
),
```

CST for `<ButtonA, ButtonB>:`:
```
(class_rule
  name: (identifier)   # ButtonA
  name: (identifier))  # ButtonB
```

- **Pros**: Minimal code change (~3 lines). Existing tests pass unchanged for single-entry rules. No CST regression.
- **Cons**: Cannot express `@Base` on individual comma-separated entries. Repeated `name:` fields lose entry-to-base association. No grouping — consumers must infer relationships positionally. Cannot mix negated entries in multi-class. Ugly for 3+ entries.
- **Effort**: Low

#### 3. **Approach C: Hidden `_class_entry` with repeated fields (middle ground)**

Like Approach B but with a **hidden** `_class_entry`:

```javascript
_class_entry: $ => choice(
  seq('-', field('negated', $.identifier)),
  seq(
    field('name', optional($.identifier)),
    optional(seq('@', field('base', $.identifier),
      repeat(seq('+', field('base', $.identifier))))),
  ),
),

class_rule: $ => seq(
  '<',
  $._class_entry,
  repeat(seq(',', $._class_entry)),
  '>',
  ':',
  optional($._rule_body),
),
```

Since `_class_entry` is hidden, the CST is FLAT (same as Approach A):
```
(class_rule
  name: (identifier)   # ButtonA
  base: (identifier)   # Base
  name: (identifier)   # LabelB
  base: (identifier))  # Label
```

- **Pros**: Clean grammar structure, supports all entry types per comma-separated entry, no new named node in CST.
- **Cons**: Repeated `name:`/`base:` fields lose positional association between entries. Same CST ambiguity as Approach A but with a better grammar structure.
- **Effort**: Medium

### Recommendation

**Approach B: Named `class_entry` rule.** Here's why:

1. **Semantic clarity**: Each `<ButtonA, ButtonB>:` produces a `class_rule` with two `class_entry` children. Any consumer can immediately see "this is a multi-class rule with N entries" without counting repeated fields.

2. **Supports real Kivy usage**: Each entry is a full selector — `ButtonA@Base, LabelB@Label` works correctly because each `class_entry` independently carries `name` + optional `base`.

3. **Future-proof**: Adding negated entries in multi-class (`<A, -B>:`) would be trivial — just add the negated alternative to `class_entry`, and it works inside the comma-separated list automatically.

4. **Tree-sitter queries work naturally**: `(class_entry name: (identifier) @name)` captures all names across all entries. `(class_rule (class_entry) @single-entry)` for LSP consumers.

The **test update cost is ~10 tests** with a mechanical change: wrap the old expected CST children inside `(class_entry ...)`. This is a one-time cost for a permanently better CST.

### Risks

- **Existing test breakage**: All ~10 class rule tests need expected CST updates. The change is mechanical (wrap in `(class_entry ...)`), but every test must be updated and verified.
- **Parser conflicts with existing comma usage**: `grammar.js` lines 18-22 list conflicts for `[$._tuple_elements]`, `[$._list_elements]`, `[$._dict_entries]`. Comma inside `<...>` is a distinct context — **no new conflicts expected**.
- **Edge case — empty entry with comma**: `<, ButtonB>:` (starts with comma) should fail. The grammar `$.class_entry, repeat(seq(',', $.class_entry))` naturally rejects this because the first entry must match first.
- **Edge case — trailing comma**: `<ButtonA,>:` — what should happen? Current pattern has `repeat(seq(',', $.class_entry))` which requires a class_entry after comma, so trailing comma would fail. This is the correct behavior — Kivy doesn't allow trailing commas in multi-class rules.
- **Edge case — `<>:` (global rule)**: Still works — `class_entry` with `field('name', optional(...))` matches empty, and `repeat(seq(',', ...))` is empty, producing `(class_rule (class_entry))`.
- **Edge case — negated entry in multi-class**: Not supported in this initial implementation. The `class_entry` `choice` includes negated, so `<A, -B>:` would parse as two entries (first named, second negated). This is technically valid Kivy syntax (each entry is independently processed). We should decide whether to enable it or explicitly reject it.
- **Potential LSP/query consumer breakage**: Any code (highlighting, folding, indentation queries) that matches `(class_rule name: ...)` directly will need updating to `(class_entry name: ...)`.

### Ready for Proposal

Yes

---

## New Tests Required

- `<ButtonA, ButtonB>:` — basic multi-class, no body
- `<ButtonA, ButtonB>:\n    font_size: '18sp'` — multi-class with body
- `<ButtonA@Button, LabelB@Label>:` — multi-class with dynamic per entry
- `<ButtonA, LabelB@Label>:` — mixed plain and dynamic
- `<ButtonA, ButtonB, ButtonC>:` — three entries
- `<ButtonA, ButtonB>:\n<OtherWidget>:` — multi-class followed by another rule
