# Proposal: Dynamic Class Rules

## Intent

Kivy's kvlang supports dynamic class rules (`<NewWidget@Button>:`) that create new widget classes inheriting from existing ones at parse time. The current grammar produces ERROR nodes on the `@` character because `@` is not part of `identifier`. Adding optional `@ base` support enables correct parsing of real-world `.kv` files.

## Scope

### In Scope

- Grammar change: extend `class_rule` with optional `@ base` clause (single + multiple inheritance)
- `<@Button>:` (no name before `@`) — explicit ERROR, not silent parse
- New corpus test cases for both single and multiple inheritance
- Spec update: revise "Rule Headers" requirement to cover dynamic class syntax

### Out of Scope

- Multi-class rules (`<A,B>:`) — deferred future work
- Negated style (`<-Name>:`) — deferred future work
- Template syntax (`[Name@Base]:`) — deprecated in Kivy, separate concern

## Capabilities

### New Capabilities

None — no entirely new spec files needed.

### Modified Capabilities

- `kvlang-core-syntax`: the `class_rule` requirement must be updated to include dynamic class syntax (`@Base`, `@Base1+Base2+...`), and the rule header test table needs new test rows for valid and invalid dynamic patterns.

## Approach

**Approach A — Extend `class_rule`** (from exploration.md). Modify `grammar.js` to add an optional `seq('@', field('base', $.identifier), repeat(seq('+', field('base', $.identifier))))` inside the angle brackets. This is purely additive — existing `<Name>:` CST trees are unchanged. The C scanner is not affected.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `grammar.js` | Modified | Extend `class_rule` seq with optional `@ base` and `+ base` repeat |
| `test/corpus/core-syntax.txt` | Modified | Add test cases: valid dynamic, multiple inheritance, error on `<@Button>:` |
| `openspec/specs/kvlang-core-syntax/spec.md` | Modified | Update Rule Headers requirement and test table |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Missing `+` multiple-inheritance syntax | Low — well-documented in Kivy | Include from the start per pre-resolved decision |
| Backward incompatibility | None | Additive only; existing `<Name>:` produces identical CST |

## Rollback Plan

1. Revert `class_rule` change in `grammar.js` to its original `seq('<', field('name', $.identifier), '>', ':', optional($._rule_body))`
2. Remove added corpus test cases from `test/corpus/core-syntax.txt`
3. Revert "Rule Headers" requirement in spec to remove dynamic class references
4. Run `npm test` (or equivalent) to verify all original 24 tests pass

## Dependencies

None.

## Success Criteria

- [ ] `<CustomButton@Button>:` produces a `class_rule` node with name "CustomButton" and base "Button"
- [ ] `<NewWidget@Behavior+Label>:` produces a `class_rule` node with name "NewWidget" and two base fields ("Behavior", "Label")
- [ ] `<@Button>:` produces an explicit ERROR node (not silent parse)
- [ ] Existing `<MyButton>:` produces identical CST to pre-change grammar
- [ ] All 24 existing corpus tests continue to pass
