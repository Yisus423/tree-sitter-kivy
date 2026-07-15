# Proposal: Multiline Event Bindings

## Intent

Real Kivy .kv files use multi-line event bindings (`on_release:\n    root.login()`). The current grammar only parses inline handlers, producing ERROR nodes for the multiline form. This adds proper multiline support with per-line statement nodes, no scanner changes needed.

## Scope

### In Scope
- Restructure `event_binding` to accept both inline (`property_value`) and multiline (`event_body`) handlers via `choice()`
- Add `event_body` rule with indent/dedent wrapping for indented Python code blocks
- Add `event_statement` rule for per-line raw text capture (`/[^\n\r]+/`)
- Test cases in `test/corpus/core-syntax.txt` for multiline bindings
- Update kvlang-core-syntax spec to describe both inline and multiline forms

### Out of Scope
- Python AST validation or highlighting of event body content
- Kivy runtime semantics (binding syntax validation)

## Capabilities

### New Capabilities
None — no new standalone capability domain.

### Modified Capabilities
- `kvlang-core-syntax`: Declaration Lines requirement must describe inline AND multiline event_binding forms. Current line 67 says `on_identifier: raw_text` — must reflect `choice(property_value, event_body)`.

## Approach

Choice-based restructure (Approach 1 from exploration): `event_binding` uses `choice(field('handler', $.property_value), field('handler', $.event_body))`. The `event_body` rule wraps indented `event_statement` lines via existing scanner INDENT/DEDENT tokens — no scanner changes. Content per line is raw text `/[^\n\r]+/` (no Python AST). Blank lines silently skipped.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `grammar.js:171-176` | Modified | `event_binding` gains `choice()` for inline/multiline |
| `grammar.js` | New | `event_body` and `event_statement` rules |
| `test/corpus/core-syntax.txt` | New | Multiline event binding test cases |
| `src/scanner.c` | None | Existing indent/dedent handles everything |
| `openspec/specs/kvlang-core-syntax/spec.md` | Modified | Declaration Line requirement updated |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Downstream tooling (kivy-language-server) breaks seeing `event_body` | Low | Field `handler` stable; new node type, not removed |
| Scanner edge case: blank lines trigger wrong DEDENT | Low | Proven by existing `_rule_body`/`canvas_block` |

## Rollback Plan

Revert grammar.js changes to `event_binding`, remove `event_body`/`event_statement` rules, revert spec delta. Pure additive change — inline form works as before. No data migration or API breakage.

## Dependencies

None.

## Success Criteria

- [ ] Existing inline event binding tests pass unchanged
- [ ] Multiline binding with 2+ statements parses without ERROR
- [ ] Single-statement multiline body parses correctly
- [ ] Multiline body followed by another declaration parses without ERROR
- [ ] Comments inside event body parse without ERROR
- [ ] Blank lines inside event body skipped without ERROR
