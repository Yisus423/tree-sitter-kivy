# Design: Multiline Event Bindings

## Technical Approach

Restructure `event_binding` to accept inline and multiline handler forms via `choice()`. Inline (`property_value`) preserves backward compatibility. Multiline triggers when the scanner emits an INDENT after the colon — zero scanner changes, reusing the existing indent/dedent mechanism from `_rule_body`, `canvas_block`, etc.

## Architecture Decisions

### Decision 1: Choice order — `property_value` before `event_body`

| Option | Tradeoff | Verdict |
|--------|----------|---------|
| `property_value` first | Inline form tried first; GLR backtracks on indent → multiline branch | **Chosen** — backward compatible, priority matches syntax |
| `event_body` first | `event_body` contains indent/dedent tokens; inline form never matches an indent | Works but misleading — first-match on the non-indented case is clearer |
| Ambiguous choice, same field name | `field('handler', ...)` in both branches errors — must be wrapped in `choice()` | Tree-sitter allows same field name across branches inside `choice()` |

**Rationale**: `property_value` first matches the common case (inline) immediately. When the scanner emits INDENT (multiline body), GLR backtracks into `event_body`. The shared `handler` field name keeps the CST stable for downstream consumers.

### Decision 2: Raw-text `event_statement` vs Python AST

| Option | Tradeoff | Verdict |
|--------|----------|---------|
| `token(/[^\n\r]+/)` | Blind per-line capture, no validation | **Chosen** — Kivy runtime validates Python, not the grammar |
| External scanner + Python lex | Massive complexity, brittle, out of scope | Rejected — tree-sitter-python would be a dependency nightmare |

**Rationale**: Tree-sitter grammars capture syntax, not semantics. Kivy runtime already validates Python event bodies. Raw text per line is correct and minimal.

### Decision 3: Blank-line handling

| Option | Tradeoff | Verdict |
|--------|----------|---------|
| Rely on scanner skip | Scanner already emits no tokens for blank lines inside indent contexts | **Chosen** — proven by `_rule_body` and `canvas_block` |
| Explicit `repeat1` with blank-line rule | More complex, duplicates scanner behavior | Rejected — unnecessary |

**Rationale**: The scanner already skips blank lines in its indent calculation. `repeat(choice(event_statement, comment-line))` naturally skips them.

### Decision 4: Comments inside `event_body`

Follow `canvas_block` pattern: `seq($.comment, optional($._newline))` as a choice alongside `$.event_statement`.

## Data Flow

```
Input: on_release:\n    root.go()\n    root.stop()

event_binding:
  event: event_name "on_release"
  ":"
  ┌─ choice:
  │   ├─ property_value  ← fails (scanner emits INDENT, no inline value)
  │   └─ event_body:
  │        ├─ _indent
  │        ├─ event_statement "root.go()"
  │        ├─ event_statement "root.stop()"
  │        └─ _dedent
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `grammar.js:171-176` | Modify | `event_binding` gains `choice()` wrapping both handler forms |
| `grammar.js` (after line 176) | Add | `event_body` and `event_statement` rule definitions |
| `test/corpus/core-syntax.txt` | Modify | Add 5 new test cases for multiline bindings |
| `src/parser.c` | Regenerate | `tree-sitter generate` — no manual edits |
| `src/scanner.c` | None | No changes needed |

## Interfaces / Contracts

```js
event_binding: $ => seq(
    field('event', $.event_name),
    ':',
    choice(
        field('handler', $.property_value),  // inline (backward compat)
        field('handler', $.event_body),       // multiline
    ),
),

event_body: $ => seq(
    $._indent,
    repeat(choice(
        $.event_statement,
        seq($.comment, optional($._newline)),
    )),
    $._dedent,
),

event_statement: $ => seq(
    token(/[^\n\r]+/),
    optional($._newline),
),
```

Field `handler` is shared across both branches — downstream tooling querying `event_binding > handler` gets either type transparently.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Corpus (regression) | All 17 existing event binding + property tests | `tree-sitter test` — must pass unchanged |
| Corpus (new) | Two-statement multiline body | `on_release:\n    root.go()\n    root.stop()` → `event_body` with 2 `event_statement` |
| Corpus (new) | Single-statement multiline | `on_press:\n    self.action()` |
| Corpus (new) | Multiline body → next declaration | `on_release:\n    root.cleanup()\n  text: "Done"` → body then property |
| Corpus (new) | Comment inside body | `on_release:\n    # comment\n    root.start()` |
| Corpus (new) | Blank lines inside body | `on_release:\n    root.a()\n\n    root.b()` → 2 statement nodes |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

No migration required. Inline `property_value` handler behavior is unchanged. Multiline bodies were previously ERROR nodes — now they parse. `tree-sitter generate` rebuilds `src/parser.c`; downstream consumers see new `event_body`/`event_statement` node types via the stable `handler` field.

## Open Questions

None — approach validated by exploration, scanner behavior confirmed by existing `_rule_body` and `canvas_block`.
