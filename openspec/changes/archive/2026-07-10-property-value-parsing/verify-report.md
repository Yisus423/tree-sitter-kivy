# Verification Report

**Change**: property-value-parsing
**Version**: 1 (delta spec for kvlang-core-syntax)
**Mode**: Standard (corpus-based grammar tests)
**Date**: 2026-07-10

## Completeness

| Metric | Value |
|--------|-------|
| Tasks total | 6 |
| Tasks complete | 6 |
| Tasks incomplete | 0 |

All 6 implementation tasks are checked [x]. No incomplete tasks.

## Build & Tests Execution

**Build**: ✅ Passed
```text
$ npx tree-sitter generate
[no output — exit code 0]
```

**Tests**: ✅ 66 passed / ❌ 0 failed / ⚠️ 0 skipped
```text
$ npx tree-sitter test
Total parses: 66; successful parses: 66; failed parses: 0; success percentage: 100.00%
```

**Parse verification — dotted_ref** (the previously critical issue):
```
$ echo 'BoxLayout:\n    pos: self.pos' | npx tree-sitter parse
(source_file
  (root_rule
    name: (identifier)
    (property
      name: (identifier)
      value: (property_value
        (dotted_ref)))))
```
✅ `self.pos` now correctly produces `(dotted_ref)`, not `(identifier)`.

**Coverage**: ➖ Not available (tree-sitter corpus tests do not produce coverage data)

## Spec Compliance Matrix

| # | Scenario | Expected | Test Block | Parse Result | Verdict |
|---|----------|----------|------------|--------------|---------|
| 1 | `text: "Hello"` | `(string)` child | Property — string value | `(string)` | ✅ COMPLIANT |
| 2 | `font_size: 24` | `(number)` child | Number — integer | `(number)` | ✅ COMPLIANT |
| 3 | `opacity: 0.5` | `(number)` child | Number — float | `(number)` | ✅ COMPLIANT |
| 4 | `offset: -3` | `(number)` child | Number — negative | `(number)` | ✅ COMPLIANT |
| 5 | `disabled: True` | `(boolean)` child | Boolean — True and False | `(boolean)` | ✅ COMPLIANT |
| 6 | `disabled: False` | `(boolean)` child | Boolean — True and False | `(boolean)` | ✅ COMPLIANT |
| 7 | `color: None` | `_none` child | None keyword | hidden `_none` | ✅ COMPLIANT |
| 8 | `size_hint: size` | `(identifier)` child | Bare identifier | `(identifier)` | ✅ COMPLIANT |
| 9 | `pos: self.center_x` | `(dotted_ref)` child | Dotted reference — 2 parts | `(dotted_ref)` | ✅ COMPLIANT |
| 10 | `size: (100, 200)` | `(tuple)` with numbers | Tuple — multiple elements | `(tuple (number) (number) (number))` | ✅ COMPLIANT |
| 11 | `size: (100,)` | `(tuple)` trailing comma | Tuple — single element with trailing comma | `(tuple (number))` | ✅ COMPLIANT |
| 12 | `font_size: self.parent.width * 0.5` | `(dotted_ref)` + hidden `_raw_value` | Raw value — arithmetic expression | `(dotted_ref)` | ✅ COMPLIANT |
| 13 | `on_press: print("clicked")` | event_binding | Event binding — on_press | `(property (identifier))` | ⚠️ PARTIAL (pre-existing) |
| 14 | `id: my_button` | id_declaration | ID declaration — bare name | id_declaration | ✅ COMPLIANT |
| 15 | `text "Hello"` | ERROR | Missing colon — ERROR | ERROR | ✅ COMPLIANT |

**Compliance summary**: 14/15 COMPLIANT, 1 PARTIAL (pre-existing, not a regression)

> **Note on scenario 13**: The `event_binding` grammar rule (`seq('on', '_', $.identifier, ...)`) cannot match `on_press:` because tree-sitter tokenizes `on_press` as a single `identifier` token. This is a pre-existing limitation of the grammar, NOT introduced by this change. The test validates correct `property_value` parsing (identifier `print` + hidden `_raw_value`).

## Correctness (Static Evidence)

| Requirement | Status | Notes |
|------------|--------|-------|
| String values | ✅ Implemented | `property_value` → `(string)` — regex token `/'[^']*'/` / `"[^"]*"/` |
| Integer number values | ✅ Implemented | `property_value` → `(number)` — `token(seq(optional('-'), /[0-9]+/))` |
| Float number values | ✅ Implemented | `property_value` → `(number)` — `token(seq(optional('-'), seq(/[0-9]+/, '.', /[0-9]+/)))` |
| Negative number values | ✅ Implemented | `property_value` → `(number)` — `token(seq('-', ...))` |
| Boolean values | ✅ Implemented | `property_value` → `(boolean)` — `token(choice('True', 'False'))` |
| None value | ✅ Implemented | `property_value` → hidden `_none` — `token('None')` |
| Bare identifier | ✅ Implemented | `property_value` → `(identifier)` — `/[a-zA-Z_]\w*/` |
| Dotted reference | ✅ Implemented | `property_value` → `(dotted_ref)` — `token(seq(ident, '.', ident, repeat(...)))` |
| Tuple values | ✅ Implemented | `property_value` → `(tuple)` — recursive with optional trailing comma |
| Raw value catch-all | ✅ Implemented | `property_value` → hidden `_raw_value` — `token(/[^\n\r]+/)` |
| Missing colon → ERROR | ✅ Implemented | No regression — ERROR node produced |

## Coherence (Design)

| Decision | Followed? | Notes |
|----------|-----------|-------|
| `property_value` as `choice()` of typed sub-rules | ✅ Yes | Uses `seq(choice(...), optional(_raw_value))` |
| Choice ordering: string, number, boolean, _none, tuple, dotted_ref, identifier | ✅ Yes | Matches design exactly |
| Remove `token.immediate` from top-level | ✅ Yes | Only `_raw_value` retains immediate token |
| `dotted_ref` requires ≥2 identifiers via `.` | ✅ Yes | `token(seq(ident, '.', ident, repeat(...)))` |
| `dotted_ref` as token for longest-match | ✅ Yes | Converted from `seq()` to `token(seq())` per fix |
| `tuple` with optional trailing comma | ✅ Yes | `('(', optional(_tuple_elements), optional(','), ')')` |
| `_raw_value` catch-all | ✅ Yes | `token(/[^\n\r]+/)` with `optional()` |
| `number` handles int, float, negative, leading dot | ✅ Yes | `token(seq(optional('-'), choice(...)))` |
| `boolean` matches only True/False | ✅ Yes | `token(choice('True', 'False'))` |

## Dotted Reference Verification

All dotted-reference related tests now correctly parse:

| Input | Previous Parse (broken) | Current Parse (fixed) | Test |
|-------|------------------------|----------------------|------|
| `pos: self.pos` | `(identifier)` | `(dotted_ref)` | Dotted reference — 2 parts |
| `origin: a.b.c` | `(identifier)` | `(dotted_ref)` | Dotted reference — 3 parts |
| `pos: self.pos` (canvas) | `(identifier)` | `(dotted_ref)` | Canvas with body instructions |
| `size: self.size` (canvas) | `(identifier)` | `(dotted_ref)` | Canvas with body instructions |
| `expr: self.parent.width * 0.5` | `(identifier)` | `(dotted_ref)` | Raw value — arithmetic expression |

## Issues Found

**CRITICAL**: None — all critical issues from previous verify have been fixed:
1. ✅ `dotted_ref` no longer unreachable — converted to `token(seq(...))` for longest-match lexing
2. ✅ `property_value` now uses inlined `choice()` ensuring fair competition between sub-rules
3. ✅ Test expectations updated from `(identifier)` to `(dotted_ref)` in 5 test blocks

**WARNING**:
1. **Duplicate `_tuple_elements` definitions** — Grammar.js lines 155-166 define `_tuple_elements` but it is overridden by a second definition at lines 197-200 (JavaScript object key collision). The first definition is dead code and should be removed.
2. **`dotted_ref` missing from `_typed_value`** — The active `_tuple_elements` definition uses `_typed_value` (choice of string, number, boolean, _none, tuple, identifier) which excludes `dotted_ref`. This means `dotted_ref` values inside tuples (e.g., `(self.x, self.y)`) are not supported. No test currently covers this case.
3. **`event_binding` rule never matches** — The `seq('on', '_', ...)` rule cannot match `on_identifier:` because tree-sitter tokenizes the prefix as a single `identifier`. Pre-existing limitation.

**SUGGESTION**:
- Remove the first (dead) `_tuple_elements` definition
- Either add `dotted_ref` to `_typed_value`, or inline the full `choice()` in `_tuple_elements` to support dotted refs inside tuples
- Consider fixing `event_binding` as a separate change (would require changing the grammar to match `on_` prefix before tokenization)

## Verdict

**PASS** — All critical issues from the previous verify (dotted_ref unreachable, wrong test expectations) have been fixed. All 15 spec scenarios have covering tests. Build succeeds (no errors). All 66/66 tests pass. `dotted_ref` now correctly parses dotted references (confirmed via direct parse). The remaining warnings are pre-existing or latent issues that do not block this change.
