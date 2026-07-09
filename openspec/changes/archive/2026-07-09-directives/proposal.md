# Proposal: Directives

## Intent

Real-world .kv files always use `#:import`, `#:set`, and `#:kivy` directives. The current core grammar treats them as comments — making real files unparsable. This change adds structured directive nodes to the CST.

## Scope

### In Scope
- `#:import` — Python import with optional alias (`from x.y import z as name`)
- `#:set` — global variable assignment (`name value_expression`)
- `#:kivy` — Kivy version declaration (`#:kivy 2.3.1`)
- Scanner changes: distinguish `#:` from `#` (comment)
- Named CST nodes (import_directive, set_directive, kivy_directive)
- Error recovery for malformed directives
- Directives valid only at file start, before any rules

### Out of Scope
- Directives after rules (Kivy runtime rejects these)
- Python expression/syntax validation
- Deprecated template directives

## Capabilities

### New Capabilities
- `kvlang-directives`: Parsing of `#:import`, `#:set`, and `#:kivy` at file start with structured CST nodes and error recovery

### Modified Capabilities
- None

## Approach

Scanner-based: extend `src/scanner.c` to distinguish `#:` from `#`:
- In BREAK path and comment-skip logic, when seeing `#`, peek at next character
- If followed by `:`, emit a `DIRECTIVE_START` external token instead of consuming the line
- Grammar.js routes this token to directive-specific rules (`import_directive`, `set_directive`, `kivy_directive`)
- `source_file` is updated to accept optional directives before rules
- Plain `#` comments continue to be consumed and discarded by the scanner

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/scanner.c` | Modified | BREAK + comment-skip paths detect `#:` |
| `grammar.js` | Modified | Add directive rules + update source_file |
| `test/corpus/directives.txt` | New | 10+ corpus tests for all directive types |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Scanner conflates `#:` with `#` | Low | Peek at 3rd char; only consume plain `#` |
| Directives need to survive whitespace skip | Low | Check `#:` before whitespace consumption |

## Rollback Plan

Revert changes to `grammar.js` and `src/scanner.c`. All core-syntax tests must still pass — no core grammar was changed.

## Dependencies

- Core grammar (archived) — provides existing scanner.c, grammar.js, and test infrastructure

## Success Criteria

- [ ] 3 directive types produce named CST nodes
- [ ] Malformed directives produce ERROR nodes
- [ ] Existing core-syntax tests pass unchanged
- [ ] Plain `#` comments still consumed as comments
- [ ] File with only directives (zero rules) parses as valid source_file
- [ ] Directives followed directly by a rule header parse correctly
