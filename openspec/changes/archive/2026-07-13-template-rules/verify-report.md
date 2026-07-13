```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:94291e750f4930ac8b57013456e90c98104c333da4d5b62e538e9fe88d126618
verdict: pass
blockers: 0
critical_findings: 0
requirements: 2/2
scenarios: 9/9
test_command: tree-sitter test
test_exit_code: 0
test_output_hash: sha256:94291e750f4930ac8b57013456e90c98104c333da4d5b62e538e9fe88d126618
build_command: tree-sitter build --wasm
build_exit_code: 0
build_output_hash: sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
```

## Verification Report

**Change**: template-rules
**Version**: 1.0.0
**Mode**: Standard

### Completeness
| Metric | Value |
|--------|-------|
| Tasks total | 8 |
| Tasks complete | 8 |
| Tasks incomplete | 0 |

### Build & Tests Execution
**Build**: ✅ Passed
```
tree-sitter build --wasm
```
Exit code: 0

**Tests**: ✅ 101 passed / 0 failed / 0 skipped
```
tree-sitter test
```
All 101 parses successful (100.00%). Includes 9 new template_rules tests + 92 existing regression tests unchanged.

**Coverage**: ➖ Not available (tree-sitter has no built-in coverage)

### Spec Compliance Matrix
| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| Template Rule Header | Bare template without base (`[Template]:`) | `template_rules.txt > Template rule — name only` | ✅ COMPLIANT |
| Template Rule Header | Template with single base (`[Custom@Button]:`) | `template_rules.txt > Template rule — name with single base` | ✅ COMPLIANT |
| Template Rule Header | Template with multiple bases (`[NewWidget@Behavior+Label]:`) | `template_rules.txt > Template rule — name with multiple bases` | ✅ COMPLIANT |
| Template Rule Header | Empty brackets (`[]:`) produce ERROR | `template_rules.txt > Template rule — empty brackets ERROR` | ✅ COMPLIANT |
| Template Rule Header | Missing name with only base (`[@Button]:`) produces ERROR | `template_rules.txt > Template rule — @ only before name ERROR` | ✅ COMPLIANT |
| Template Rule Body | Template with property body (`[T]:` + `  text: "Hello"`) | `template_rules.txt > Template rule — with body` | ✅ COMPLIANT |
| Template Rule Body | Template without body, followed by another rule | `template_rules.txt > Template rule — no body, followed by another rule` | ✅ COMPLIANT |
| Template Rule Body | Template with child widget (`[T]:` + `  Button:`) | `template_rules.txt > Template rule — with child widget in body` | ✅ COMPLIANT |
| Template Rule Body | Template with canvas block (`[T]:` + `  canvas:` + instructions) | `template_rules.txt > Template rule — with canvas block in body` | ✅ COMPLIANT |

**Compliance summary**: 9/9 scenarios compliant

### Correctness (Static Evidence)
| Requirement | Status | Notes |
|------------|--------|-------|
| Template Rule Header | ✅ Implemented | `template_entry` and `template_rule` rules in grammar.js (lines 108–120). `$.template_rule` added to `_rule` choice (line 73). Headers produce `(template_rule (template_entry name: (identifier)))` nodes. |
| Template Rule Body | ✅ Implemented | `template_rule` uses `optional($._rule_body)` — same body syntax as `class_rule`. Supports properties, child widgets, canvas blocks. |

### Coherence (Design)
| Decision | Followed? | Notes |
|----------|-----------|-------|
| Dedicated `template_entry` sub-rule | ✅ Yes | grammar.js lines 108–112. Enforces name-required semantics; `[@Button]:` correctly produces ERROR. |
| Named `template_entry` vs anonymous fields | ✅ Yes | `template_entry` is a named rule producing `(template_entry)` nodes in CST, consistent with `class_entry`. |
| `template_rule` in `_rule` choice | ✅ Yes | grammar.js line 73: `choice($.root_rule, $.class_rule, $.template_rule)` |
| `[...]:` delimiters with optional body | ✅ Yes | grammar.js lines 114–120: `'[', $.template_entry, ']', ':', optional($._rule_body)` |
| No scanner changes needed | ✅ Yes | `[`/`]` handled entirely in grammar.js; no external token modifications. |

### Author Line Count
| File | Change | Lines |
|------|--------|-------|
| `grammar.js` | Added `template_entry`, `template_rule`, `$.template_rule` to `_rule` | +15 / -1 |
| `test/corpus/template_rules.txt` | New file — all 9 spec scenarios | +141 |
| **Total authored** | | **~156 lines** |
| 400-line budget risk | Low | ✅ Well under budget |

### Issues Found
**CRITICAL**: None
**WARNING**: None
**SUGGESTION**: None

### Verdict
**PASS**
All 9 spec scenarios have passing corpus tests. All 8 tasks complete. All design decisions followed. Zero regressions in existing 92 tests. ~156 authored lines, well under the 400-line budget.
