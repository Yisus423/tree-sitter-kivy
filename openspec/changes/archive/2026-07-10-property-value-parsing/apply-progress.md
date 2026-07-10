## Apply Progress: Property Value Parsing

**Status**: success — all 6 tasks complete
**Mode**: Standard (corpus-based grammar tests)
**Delivery**: single PR (fits within 400-line budget)

### Completed Tasks

**Phase 1: Grammar Changes (grammar.js)**
- [x] 1.1 Added atomic sub-rules: `number` (int/float/negative), `boolean` (True/False), `_none` (None), `_raw_value` (catch-all token)
- [x] 1.2 Added compound sub-rules: `dotted_ref` (token rule with ≥2 identifiers via `.`), `tuple` (parenthesized with optional trailing comma)
- [x] 1.3 Rewrote `property_value` as `seq(choice(string, number, boolean, _none, tuple, dotted_ref, identifier), optional(_raw_value))`

**Phase 2: Test Updates (corpus tests)**
- [x] 2.1 Updated core-syntax.txt S-expressions (~11 existing tests)
- [x] 2.2 Updated canvas.txt S-expressions (~5 tests)
- [x] 2.3 Added 12 new test blocks: number (int, float, negative), boolean, None, bare identifier, dotted_ref (2-part, 3-part), tuple (empty, 1-elem, multi), raw value (arithmetic, function call)
- [x] 2.4 All 66/66 tests pass (100%)

### Fixes Applied

**Verify CRITICAL: dotted_ref unreachable**
The verify phase found dotted_ref was unreachable due to `identifier + _raw_value` subsuming it. Fix:
- Converted `dotted_ref` from `seq()` to `token(seq(...))` — lexer handles longest-match disambiguation
- Inlined the choice inside `property_value: seq(choice(...), optional(_raw_value))` so dotted_ref competes fairly
- All 5 failing tests updated with correct S-expressions expecting `(dotted_ref)` instead of `(identifier)`

**Test Fixes Applied**
- **"Root rule missing colon — ERROR"**: Reverted incorrect modification
- **"#: inside rule body"**: Updated S-expression
- **Dotted reference tests**: Changed expected `(identifier)` → `(dotted_ref)`
- **Arithmetic expression test**: Changed expected `(identifier)` → `(dotted_ref)`
- **Canvas tests**: Changed `pos: self.pos` and `size: self.size` expected `(identifier)` → `(dotted_ref)`

### Files Changed
| File | Action | What Was Done |
|------|--------|---------------|
| `grammar.js` | Modified | Added `number`, `boolean`, `_none`, `_raw_value`, `dotted_ref` (token), `tuple`; rewrote `property_value` as seq(choice, optional raw) |
| `test/corpus/core-syntax.txt` | Modified | Updated 11 existing tests, added 12 new test blocks |
| `test/corpus/canvas.txt` | Modified | Updated 5 existing tests (dotted_ref + tuple) |
| `test/corpus/directives.txt` | Modified | Updated 1 test |
| `src/grammar.json` | Auto-regenerated | Parser tables |
| `src/node-types.json` | Auto-regenerated | Node type metadata |
| `src/parser.c` | Auto-regenerated | Generated parser |

### Next
Ready for sdd-verify — 66/66 tests pass, dotted_ref now reachable and correctly parsed.
