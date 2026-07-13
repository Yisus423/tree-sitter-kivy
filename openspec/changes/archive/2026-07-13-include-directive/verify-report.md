```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:66fd35e6245e1d7f6152ca2f979eb368bccfc1f6cd0a6814f8b4bede2bbe3f3b
verdict: pass
blockers: 0
critical_findings: 0
requirements: 2/2
scenarios: 9/10
test_command: tree-sitter test
test_exit_code: 0
test_output_hash: sha256:66fd35e6245e1d7f6152ca2f979eb368bccfc1f6cd0a6814f8b4bede2bbe3f3b
build_command: tree-sitter build
build_exit_code: 0
build_output_hash: sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
```

## Verification Report

**Change**: include-directive
**Version**: delta-spec kvlang-directives (2026-07-13)
**Mode**: Standard

### Completeness
| Metric | Value |
|--------|-------|
| Tasks total | 9 |
| Tasks complete | 9 |
| Tasks incomplete | 0 |

### Build & Tests Execution
**Build**: ✅ Passed
```
$ tree-sitter build
(no output — success)
```

**Tests**: ✅ 92 passed, 0 failed, 0 skipped
```
$ tree-sitter test
  directives:
      ... (5 new include tests + 4 existing)
Total parses: 92; successful parses: 92; failed parses: 0; success percentage: 100.00%
```

**Coverage**: ➖ Not available (tree-sitter corpus tests)

### Spec Compliance Matrix

**Requirement: `#:include` Directive (ADDED — 5 scenarios)**

| Scenario | Test Name (test/corpus/directives.txt) | Result |
|----------|----------------------------------------|--------|
| `#:include myfile.kv` → include_directive node with path (directive_value) | "Single #:include directive" (line 180) | ✅ COMPLIANT |
| `#:include force myfile.kv` → path captures "force myfile.kv" (no structured field) | "#:include with force keyword" (line 191) | ✅ COMPLIANT |
| `#:include subdir/nested/file.kv` → path with directory separators | "#:include with relative path" (line 202) | ✅ COMPLIANT |
| Mixed `#:import`, `#:include`, `#:set` → all parse under source_file | "Mixed #:include with other directives" (line 213) | ✅ COMPLIANT |
| `#:include` with no path → ERROR node | "Malformed #:include — missing path" (line 232) | ✅ COMPLIANT |

**Requirement: Malformed Directives (MODIFIED — 5 scenarios, 1 new)**

| Scenario | Test Name (test/corpus/directives.txt) | Result |
|----------|----------------------------------------|--------|
| `#:unknown some args` at column 0 → ERROR node | "Malformed directive — unknown keyword" (line 133) | ✅ COMPLIANT *(pre-existing)* |
| `#:import` with no alias or module → ERROR node | "Malformed directive — #:import missing arguments" (line 144) | ✅ COMPLIANT *(pre-existing)* |
| `#:set` with no name → ERROR node | "Malformed directive — #:set missing name" (line 154) | ✅ COMPLIANT *(pre-existing)* |
| `#:import : Button` → ERROR node | *(no dedicated test found)* | ⚠️ UNTESTED *(pre-existing gap, not part of this delta)* |
| `#:include` with no path → ERROR node | "Malformed #:include — missing path" (line 232) | ✅ COMPLIANT |

**Compliance summary**: 9/10 scenarios compliant (1 pre-existing gap unrelated to this change)

### Correctness (Static Evidence)

| Requirement | Status | Notes |
|-----------|--------|-------|
| `#:include` Directive — grammar rule | ✅ Implemented | `include_directive` rule at grammar.js:64-69 follows the `kivy_directive` pattern: `seq(_directive_start, 'include', field('path', directive_value), _newline)` |
| `#:include` Directive — wired into _directive | ✅ Implemented | `$.include_directive` added to `_directive` choice at grammar.js:38 |
| force token NOT a structured field | ✅ Implemented | No `field('force', ...)` — stays raw in `directive_value` |
| Malformed Directives — `include` as known keyword | ✅ Implemented | `#:include` without path produces ERROR (test line 232-239). Unknown keyword test already covers `#:unknown` → ERROR |
| Regenerated parser | ✅ Implemented | `src/parser.c`, `src/grammar.json`, `src/node-types.json` all regenerated |
| No scanner changes | ✅ Confirmed | `externals` in grammar.js unchanged; no C scanner modifications |

### Coherence (Design)

| Decision | Followed? | Notes |
|----------|-----------|-------|
| `include_directive` follows `kivy_directive` pattern | ✅ Yes | Same structure: `_directive_start` → keyword → `field('path', directive_value)` → `_newline` |
| `force` is NOT a structured field | ✅ Yes | Stays in raw `directive_value` — no `force` token or boolean field |
| No scanner changes | ✅ Yes | `external` tokens list unchanged from base grammar |
| Wired into `_directive` choice | ✅ Yes | `$.include_directive` at grammar.js:38 |
| `directive_value` = `/[^\n\r]+/` (no new token) | ✅ Yes | Reuses existing `.directive_value` token — no new token type added |

### Issues Found

**CRITICAL**: None
- All 5 new spec scenarios have passing covering tests.
- All 9 tasks are complete.
- Build and test exit codes are 0.

**WARNING**: None
- No design deviations found.
- All new tests pass with existing corpus intact (92/92, 100%).

**SUGGESTION**: 
- The `#:import : Button` → ERROR scenario in the Malformed Directives requirement has no dedicated test case. This is a pre-existing gap that was NOT introduced by this change, but could be added as a separate cleanup task.

### Verdict

**PASS** — The `#:include` directive implementation is complete and verified: all 9 tasks done, all 5 new spec scenarios covered by passing tests, 92/92 corpus parses pass (100%), implementation matches design exactly, and no critical or warning issues found.
