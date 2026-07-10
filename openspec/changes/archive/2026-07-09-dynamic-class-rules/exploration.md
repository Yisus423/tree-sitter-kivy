## Exploration: dynamic-class-rules

### Current State

The grammar in `grammar.js` defines `class_rule` as:

```js
class_rule: $ => seq(
    '<',
    field('name', $.identifier),
    '>',
    ':',
    optional($._rule_body),
),
```

Where `identifier` is `/[a-zA-Z_]\w*/` (line 133). The `@` character is NOT part of `identifier`, so `<CustomButton@Button>:` produces an ERROR node at the `@` position.

The `_rule` production (line 57) dispatches to `$.root_rule` or `$.class_rule` only:

```js
_rule: $ => choice($.root_rule, $.class_rule),
```

No dynamic class support exists. The original proposal (`archive/2026-07-09-core-grammar/proposal.md`) listed dynamic classes as **Out of Scope** (line 20). The original exploration (`exploration/kvlang-grammar-research/exploration.md`) planned dynamic classes for Phase 3, item 5.

### Affected Areas

| File | Why affected |
|------|-------------|
| `grammar.js` | Core change — must extend `class_rule` or add new rule for `@` syntax |
| `test/corpus/core-syntax.txt` | Must add test cases for `<Name@Base>:` and `<Name@Base1+Base2>:` |
| `openspec/specs/kvlang-core-syntax/spec.md` | Must update spec to include dynamic class requirements |
| `openspec/changes/dynamic-class-rules/` | New change folder — proposal, spec, design, tasks |
| `src/scanner.c` | **Not affected** — `@` and `+` are regular characters consumed by the internal scanner mid-line; indentation tracking is unchanged |

### What Kivy's kv Language Spec Says

From the [Kivy 2.3.1 docs](https://kivy.org/doc/stable/api-kivy.lang.html#dynamic-classes):

> **Simple inheritance**:
> ```kv
> <NewWidget@Button>:
>     # kv code here ...
> ```
>
> **Multiple inheritance**:
> ```kv
> <NewWidget@ButtonBehavior+Label>:
>     # kv code here ...
> ```

The `@` character separates the new class name from the base class(es). `+` separates multiple base classes. The Python equivalent would be `class NewWidget(Button):` or `class NewWidget(ButtonBehavior, Label):`.

Additionally, there are related `<...>` patterns in Kivy to be aware of:

| Pattern | Example | Implemented? |
|---------|---------|-------------|
| Simple class rule | `<MyButton>:` | ✅ Yes |
| Dynamic class (single inheritance) | `<CustomButton@Button>:` | ❌ No |
| Dynamic class (multiple inheritance) | `<NewWidget@Behavior+Label>:` | ❌ No |
| Multi-class rule | `<ButtonA,ButtonB>:` | ❌ Not yet (deferred) |
| Negated style | `<-MyWidget>:` | ❌ Not yet (deferred) |
| Template (deprecated) | `[TemplateName@BaseClass]:` | ❌ Not yet (uses `[]`, separate) |

### Approaches

1. **Approach A: Extend `class_rule` with optional `@ base`** — Modify `class_rule` to accept an optional `@` followed by base identifier(s):
   ```
   class_rule: $ => seq(
       '<',
       field('name', $.identifier),
       optional(seq('@', field('base', $.identifier),
           repeat(seq('+', field('base', $.identifier))))),
       '>',
       ':',
       optional($._rule_body),
   ),
   ```
   - Pros: Single rule type, zero CST change for existing `<Name>:` parses, backward compatible, queries can filter by `base` field presence
   - Cons: Mixes semantically different concepts under one node type
   - Effort: **Low** (~15 lines grammar change + tests)

2. **Approach B: Add separate `dynamic_class_rule`** — Create a new rule alongside `class_rule`:
   ```
   _rule: $ => choice($.root_rule, $.class_rule, $.dynamic_class_rule),
   
   dynamic_class_rule: $ => seq(
       '<',
       field('name', $.identifier),
       '@',
       field('base', $.identifier),
       repeat(seq('+', field('base', $.identifier))),
       '>',
       ':',
       optional($._rule_body),
   ),
   ```
   - Pros: Clear semantic separation, simpler tree-sitter queries to match dynamic classes specifically
   - Cons: Code duplication with `class_rule`, more node types to maintain, CST structure differs from parent class rule
   - Effort: **Low** (~20 lines grammar change + tests)

### Recommendation

**Approach A — Extend `class_rule` with optional `@ base`.**

Rationale:
1. In kvlang, a dynamic class `IS` a class rule semantically — it's the same `<...>:` construct with an optional inheritance clause. The original exploration doc and the design doc both treat them as a continuum.
2. **Zero backward compatibility risk** — existing `<Name>:` parses produce identical CST trees. The `base` field is absent for simple class rules and present for dynamic classes.
3. Simpler downstream tooling: a single `class_rule` query covers all class-like rules; the optional `base` field enables filtering.
4. Naturally extensible to multi-class rules (`<A,B>:`) and negated style (`<-Name>:`) later by further extending the content between `<` and `>`.

### Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| **Missing Kivy `+` syntax** for multiple inheritance | Low — well-documented in Kivy API | Include `+` support from the start (repeat of base identifiers) |
| **Incomplete dynamic class syntax** — Kivy also supports inline property defaults and `cls` attribute in dynamic classes | Low — these are rule-body concerns, not parsing concerns | The body already handles properties; no grammar change needed beyond the header |
| **Backward incompatibility** with existing CST consumers | None | Existing `<Name>:` CST unchanged; additive only |

### Ready for Proposal

**Yes.** The approach is clear, effort is Low, and there are no blocking unknowns. The orchestrator should proceed to `sdd-propose`.

Key points for the orchestrator to tell the user:
1. The change is purely additive — no breaking changes to existing parses
2. The scanner needs zero changes (no indentation impact)
3. The `+` syntax for multiple inheritance should be included from the start
4. Multi-class rules (`<A,B>:`) and negated style (`<-Name>:`) remain deferred
