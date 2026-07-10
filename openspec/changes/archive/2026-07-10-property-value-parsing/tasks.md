# Tasks: Property Value Parsing

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 120–160 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR (fits within budget; force-chained delivery keeps stacked-to-main as convention) |
| Delivery strategy | force-chained |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: stacked-to-main
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Grammar + tests atomically | Single PR | Under 400 lines; self-contained, all tests included |

## Phase 1: Grammar Changes (grammar.js)

- [x] 1.1 Add atomic sub-rules: `number` (int/float/negative via `token(seq(optional('-'), choice(…)))`), `boolean` (`token(choice('True', 'False'))`), `_none` (`token('None')`), `_raw_value` (`token(/[^\n\r]+/)` catch-all)
- [x] 1.2 Add compound sub-rules: `dotted_ref` (≥2 identifiers joined by `.`), `_tuple_elements` (recursive `property_value` list), `tuple` (parenthesized with optional trailing comma)
- [x] 1.3 Rewrite `property_value` as `seq(_typed_value, optional(_raw_value))` with `_typed_value` choice (design deviation: used `seq`+`_typed_value` wrapper instead of flat `choice` to allow raw trailing content)

## Phase 2: Test Updates (corpus tests)

- [x] 2.1 Update S-expressions in `test/corpus/core-syntax.txt` (~11 tests: typed nodes e.g., `(string)`, `(number)`, `(identifier)`)
- [x] 2.2 Update S-expressions in `test/corpus/canvas.txt` (~5 tests: `(tuple (number)…)`, `(identifier)`)
- [x] 2.3 Add test blocks: number (int, float, negative), boolean, None, bare identifier, dotted_ref (2-part, 3-part), tuple (empty, 1-element, multi), raw value (arithmetic, function call)
- [x] 2.4 Run `npx tree-sitter generate && npx tree-sitter test` — 66/66 pass (100%)
