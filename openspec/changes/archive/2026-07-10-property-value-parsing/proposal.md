# Proposal: Property Value Parsing

## Intent

Property values are currently flat raw text (`token.immediate(/[^\n\r]+/)`). This prevents tools (highlighting, navigation, structured editing) from distinguishing between strings, numbers, booleans, references, and tuples — types covering ~85% of real Kivy property values. Structured CST nodes unlock useful tooling with modest complexity.

## Scope

### In Scope
- Parse strings, numbers, booleans, `None`, bare identifiers, dotted references, and parenthesized tuples as structured sub-rules
- `_raw_value` catch-all for unrecognized patterns (lists, dicts, expressions, function calls)
- Update ~11 existing tests with new S-expression shapes
- Add ~10-15 new tests for each value type
- Delta spec for `kvlang-core-syntax` "Declaration Lines" requirement

### Out of Scope
- `directive_value` structured parsing — deferred to future change
- Lists, dicts, function calls, arithmetic expressions
- Bare tuples without parentheses (`1, 1` style)
- Hex colors and nested containers

## Capabilities

### New Capabilities
None — purely a delta to an existing capability.

### Modified Capabilities
- `kvlang-core-syntax`: "Declaration Lines" requirement updated to reflect structured property values (string, number, boolean, None, identifier, dotted_ref, tuple, raw_value) instead of flat raw text.

## Approach

Medium approach (from exploration). Rewrite `property_value` as `choice()` of structured sub-rules. Remove `token.immediate` from the top-level — apply it only to `_raw_value` catch-all. Add `number` (integers/floats, positive/negative), `boolean` (True/False), `_none` (None), `dotted_ref` (identifier.identifier...), and `tuple` (parenthesized, optional trailing comma). Reuse existing `string` rule. Keep bare `identifier` as valid. All sub-rules are token-level or simple sequences — no GLR blowup risk. Order in `choice()` ensures `True`/`False`/`None` match as keywords before `identifier`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `grammar.js` | Modified | Rewrite `property_value`, add 5 sub-rules |
| `test/corpus/core-syntax.txt` | Modified | Update ~6 tests, add ~10-15 new |
| `test/corpus/canvas.txt` | Modified | Update ~5 tests |
| `openspec/specs/kvlang-core-syntax/spec.md` | Modified | Delta for Declaration Lines |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Test churn — S-expressions change | Low | Changes are additive (new child nodes), not subtractive |
| Tuple ambiguity with unclosed parens | Low | `_raw_value` catch-all acts as fallback |
| Dotted ref vs. identifier ambiguity | Low | `.` presence disambiguates — lone identifier can't match `dotted_ref` |

## Rollback Plan

Revert `grammar.js` to old `property_value: $ => token.immediate(/[^\n\r]+/)`, run `npx tree-sitter generate`, revert test S-expression updates. One-commit revert.

## Dependencies

None.

## Success Criteria

- [ ] `npx tree-sitter generate` succeeds
- [ ] All existing tests pass with updated S-expressions
- [ ] New tests cover: string, number (int/float/negative), boolean, None, identifier, dotted_ref, tuple (empty, 1-element, multi, trailing comma), raw_value catch-all
- [ ] Parser produces correct typed child nodes for each value type
