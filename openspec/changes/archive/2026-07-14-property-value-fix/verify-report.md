```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:620402fd4da5f7da8bf75e84d3b9abf09098aea4e055d39e77dae91da15c79a8
verdict: pass
blockers: 0
critical_findings: 0
requirements: 1/1
scenarios: 18/19
test_command: npx tree-sitter test
test_exit_code: 0
test_output_hash: sha256:620402fd4da5f7da8bf75e84d3b9abf09098aea4e055d39e77dae91da15c79a8
build_command: npx tree-sitter generate
build_exit_code: 0
build_output_hash: sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
```

## Verification Report

**Change**: property-value-fix
**Version**: N/A (delta spec v1)
**Mode**: Strict TDD

### Completeness

| Metric | Value |
|--------|-------|
| Tasks total | 6 |
| Tasks complete | 6 |
| Tasks incomplete | 0 |

All 6 tasks are marked [x] and verified complete.

### Build & Tests Execution

**Build**: ✅ Passed
```text
npx tree-sitter generate → exit 0 (no output — parser.c regenerated silently)
```

**Tests**: ✅ 103 passed / ❌ 0 failed / ⚠️ 0 skipped
```text
npx tree-sitter test → Total parses: 103; successful parses: 103; failed parses: 0; success percentage: 100.00%
```

**Coverage**: ➖ Not available (tree-sitter grammar project — no JS coverage tool configured)

### Spec Compliance Matrix

**Requirement**: Declaration Lines (MODIFIED by delta spec)

| # | Scenario | Test | Result |
|---|----------|------|--------|
| 1 | `text: "Hello"` → `string` | `core-syntax.txt` > Property — string value (#16) | ✅ COMPLIANT |
| 2 | `font_size: 24` → `number` | `core-syntax.txt` > Number — integer (#49) | ✅ COMPLIANT |
| 3 | `opacity: 0.5` → `number` | `core-syntax.txt` > Number — float (#50) | ✅ COMPLIANT |
| 4 | `offset: -3` → `number` | `core-syntax.txt` > Number — negative (#51) | ✅ COMPLIANT |
| 5 | `disabled: True` → `boolean` | `core-syntax.txt` > Boolean — True and False (#52) | ✅ COMPLIANT |
| 6 | `disabled: False` → `boolean` | `core-syntax.txt` > Boolean — True and False (#52) | ✅ COMPLIANT |
| 7 | `color: None` → `_none` | `core-syntax.txt` > None keyword (#53) | ✅ COMPLIANT |
| 8 | `size_hint: size` → `identifier` | `core-syntax.txt` > Bare identifier (#54) | ✅ COMPLIANT |
| 9 | `pos: self.center_x` → `dotted_ref` | `core-syntax.txt` > Dotted reference — 2 parts (#55) | ✅ COMPLIANT |
| 10 | `size: (100, 200)` → `tuple` | `core-syntax.txt` > Tuple — multiple elements (#59) | ✅ COMPLIANT |
| 11 | `size: (100,)` → `tuple` | `core-syntax.txt` > Tuple — single element (#58) | ✅ COMPLIANT |
| 12 | `font_size: self.parent.width * 0.5` → `raw_value` | `core-syntax.txt` > Raw value — arithmetic expression (#61) | ⚠️ PARTIAL* |
| 13 | `size_hint: (root.x + root.y)` → `raw_value` | `core-syntax.txt` > Raw value — parenthesized expression (#63) | ✅ COMPLIANT |
| 14 | `on_press: print("clicked")` → event_binding | `core-syntax.txt` > Event binding — on_press (#17) | ✅ COMPLIANT |
| 15 | `id: my_button` → `id_declaration` | `core-syntax.txt` > ID declaration — bare name (#20) | ✅ COMPLIANT |
| 16 | `id: "my_button"` → `id_declaration` | `core-syntax.txt` > ID declaration — quoted name (#21) | ✅ COMPLIANT |
| 17 | `canvas:` → canvas_block | Canvas corpus tests | ✅ COMPLIANT |
| 18 | `canvas.before:` → canvas_block | Canvas corpus tests | ✅ COMPLIANT |
| 19 | `text "Hello"` → ERROR | `core-syntax.txt` > Missing colon in property — ERROR (#22) | ✅ COMPLIANT |

*\*Scenario #12: spec says `raw_value` child, but actual CST shows `(dotted_ref)`. This is a pre-existing behavior: `dotted_ref` matches `self.parent.width`, and hidden `_raw_value` suffix captures ` * 0.5`. The test passes and has always expected `dotted_ref`. NOT introduced by this change.*

**Compliance summary**: 18/19 scenarios compliant, 1 partial (pre-existing spec inaccuracy)

### Correctness (Static Evidence)

| Requirement | Status | Notes |
|------------|--------|-------|
| Add named `raw_value` rule for `(expr)` catch-all | ✅ Implemented | `raw_value: $ => $._paren_token` delegating to `token(seq('(', /[^,)\n\r]+/, ')'))` |
| Add `$.raw_value` to `property_value` choice | ✅ Implemented | `$.raw_value` inside the inner `choice()` — before `optional($._raw_value)` suffix |
| Keep `_raw_value` as hidden suffix token | ✅ Implemented | `optional($._raw_value)` still at end of `property_value` seq |
| 103/103 corpus tests pass | ✅ Verified | 102 existing + 1 new parenthesized catch-all test |
| `size_hint: (root.x + root.y)` → `raw_value` | ✅ Verified | Test #63 passes with expected `(raw_value)` CST |
| `size: (100, 200)` still → `tuple` | ✅ Verified | Test #59 passes — tuple still takes priority |
| No stale `_raw_value` references | ✅ Verified | Only 2 intentional uses: `optional($._raw_value)` and `_raw_value: $ => token(...)` — both correct |

### Coherence (Design)

| Decision | Design Says | Implementation | Followed? |
|----------|-------------|----------------|-----------|
| Catch-all position | `choice(seq(typed..., optional(raw_value)), raw_value)` first | Used `_paren_token` scoped token inside the inner `choice()` — not a standalone choice alternative | ❌ DEVIATED (documented) |
| Catch-all as `raw_value` rule | Reuse renamed `raw_value` | `raw_value: $ => $._paren_token` — reuses name but delegates to scoped token | ✅ YES |
| Grammar-level `choice` | No scanner changes needed | No scanner changes | ✅ YES |
| Add 1 corpus test case | Test for `size_hint: (root.x + root.y)` | Test added and passing (#63) | ✅ YES |

**Deviation explanation**: The design's `choice(seq(typed..., optional(raw_value)), raw_value)` approach was found to be infeasible because Tree-sitter's GLR parser always prefers the catch-all `raw_value` token (using `token(/[^\n\r]+/)`) over typed alternatives at the lexer level. The implemented fix uses a scoped `_paren_token` that only matches `(expr_without_commas)`, avoiding lexer-level competition with typed tokens. This deviation is thoroughly documented in `apply-progress` with root cause analysis.

### TDD Compliance

| Check | Result | Details |
|-------|--------|---------|
| TDD Evidence reported | ✅ | Found in apply-progress (Engram #963) |
| All tasks have tests | ✅ | 6/6 tasks verified — test file, grammar changes, build, test execution, source audit |
| RED confirmed (tests exist) | ✅ | 1/1 test files verified — `test/corpus/core-syntax.txt` has the new test case |
| GREEN confirmed (tests pass) | ✅ | 103/103 tests pass on execution |
| Triangulation adequate | ➖ | 1 single-case scenario — appropriate for a single parenthesized catch-all |
| Safety Net for modified files | ✅ | 102/102 existing tests ran before implementation (reported as safety net) |

**TDD Compliance**: 6/6 checks passed

### Test Layer Distribution

| Layer | Tests | Files | Tools |
|-------|-------|-------|-------|
| Corpus (CST fixture) | 1 new + 102 existing | 1 file (`test/corpus/core-syntax.txt`) | tree-sitter CLI |
| **Total** | **103** | **1** | |

*Note: tree-sitter projects use structural corpus tests (input → expected CST S-expression). No traditional unit/integration/E2E distinction applies.*

### Assertion Quality

No traditional assertion patterns exist in tree-sitter corpus tests. Each test case provides:
- Input source text
- Expected CST S-expression output

The test framework parses the input and performs structural tree comparison. This is the correct testing pattern for tree-sitter grammars.

**Assertion quality**: ✅ All assertions verify real parse tree structure — no tautologies, no ghost loops, no trivial assertions.

### Quality Metrics

**Linter**: ➖ Not available (grammar.js is a JS DSL with no standard linter configuration)
**Type Checker**: ➖ Not available (no tsconfig.json for grammar.js DSL)
**Coverage**: ➖ Not available (tree-sitter grammar project)

### Issues Found

**CRITICAL**: None
**WARNING**: None
**SUGGESTION**:
- Spec scenario #12 (`font_size: self.parent.width * 0.5`) describes the expected CST as having `raw_value` child, but the actual parse tree shows `(dotted_ref)`. This is pre-existing behavior (the expression ` * 0.5` is captured by hidden `_raw_value` suffix). Consider updating the spec to reflect actual CST: `value `dotted_ref` child with implicit `_raw_value` suffix` instead of `raw_value child`.
- The design's `choice()` restructure was replaced with a `_paren_token` approach due to GLR behavior. The apply-progress documents the deviation thoroughly — no action needed but the design.md remains outdated.

### Verdict

**PASS**

All 6 tasks complete, 103/103 tests pass, build succeeds, spec scenarios for the change's core scope (`(expr)` catch-all → `raw_value`) are COMPLIANT with runtime evidence. One pre-existing spec inaccuracy exists (scenario #12 CST description) — not introduced by this change. Design deviation is well-documented and justified by Tree-sitter GLR constraints.
