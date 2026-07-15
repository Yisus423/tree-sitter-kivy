## Exploration: multiline-event-bindings

### Current State

The `event_binding` rule at `grammar.js:171-176` only supports inline handlers:

```js
event_binding: $ => seq(
    field('event', $.event_name),
    ':',
    field('handler', $.property_value),
    optional($._newline),
),
```

Where `property_value` consumes content to end-of-line via `_raw_value: token(/[^\n\r]+/)`. When parsing a real multiline event binding like:

```kv
on_press:
    root.manager.transition.direction = 'right'
    root.manager.current = 'menu'
```

The grammar produces an `ERROR` node — confirmed by running `tree-sitter parse` against a test file containing this pattern. The inline `on_release: root.manager.next()` at line 9 of the same file parses correctly.

### External Scanner Analysis

The scanner (`src/scanner.c`) already has a complete indent/dedent stack mechanism used by `_rule_body` and `canvas_block`. Key behavior:

- After `on_press:`, the scanner encounters `\n`, counts the next line's indent, and emits `INDENT` (NOT `NEWLINE`) when indent > stack top.
- Between body lines at the same indent, the scanner emits `NEWLINE`.
- When the body ends (next line has less indent), the scanner emits `DEDENT`.

**Critical insight**: there is NO `NEWLINE` token emitted between `:` and `INDENT`. The `\n` is consumed by the scanner as part of the indent determination, not as a separate newline token. This means `$._newline` must NOT appear before `$._indent` in the multiline grammar branch.

### Affected Areas

- `grammar.js:171-176` — `event_binding` rule (needs restructuring to accept both forms)
- `grammar.js` — new rules needed: `event_body`, `event_statement`
- `test/corpus/core-syntax.txt` — new test cases for multiline event bindings
- `src/scanner.c` — **NO changes needed** (existing indent/dedent logic already handles the pattern)

### Approaches

#### 1. Choice-based restructure with `event_body` wrapper (RECOMMENDED)

```js
event_binding: $ => seq(
    field('event', $.event_name),
    ':',
    choice(
        field('handler', $.property_value),     // inline (backward compat)
        field('handler', $.event_body),          // multiline
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

CST for multiline input:
```
(event_binding
  event: (event_name)
  handler: (event_body
    (event_statement)    ← "root.manager.transition.direction = 'right'"
    (event_statement)))  ← "root.manager.current = 'menu'"
```

**Pros**:
- Clean separation of inline vs multiline via `choice()`
- Backward compatible — existing tests pass unchanged
- `event_body` wrapper is queryable (folding, code lenses)
- Per-line `event_statement` nodes (good for syntax highlighting, line-level features)
- No scanner changes needed
- Supports comments inside event bodies

**Cons**:
- Adds 3 new grammar rules
- `event_statement` is raw text (no Python AST parsing — but that's by design; Kivy's grammar describes the KV structure, not Python)
- Field name `handler` is reused for both forms (type is different: `property_value` vs `event_body`)

**Effort**: Low

**Scanner implications**: None. The existing indent/dedent stack mechanism handles everything:
1. After `:` → `\n` → scanner emits `INDENT` (not NEWLINE)
2. Between body lines → scanner emits `NEWLINE` (consumed by `event_statement`'s `optional($._newline)`)
3. Last line → scanner emits `DEDENT` (not NEWLINE; `optional($._newline)` gracefully absent)

---

#### 2. Flat structure without `event_body` wrapper

```js
event_binding: $ => seq(
    field('event', $.event_name),
    ':',
    choice(
        field('handler', $.property_value),
        seq(
            $._indent,
            repeat(choice(
                $.event_statement,
                seq($.comment, optional($._newline)),
            )),
            $._dedent,
        ),
    ),
),
```

CST:
```
(event_binding
  event: (event_name)
  (event_statement)
  (event_statement))
```

**Pros**: Fewer rules, no wrapper node to navigate through
**Cons**: Harder to query (statements are direct children alongside `event` field), no clear grouping
**Effort**: Low

---

#### 3. Single blob node (no per-line structure)

```js
event_body: $ => token(seq(
    /[^\n\r]+(\n[^\n\r]+)*/,
    // ?? can't work with scanner tokens interleaved
)),
```

**Pros**: Single node, conceptually simple
**Cons**: **IMPOSSIBLE** — the scanner interleaves `NEWLINE`, `INDENT`, and `DEDENT` tokens between content lines. A single regex token can't span multiple scanner tokens. The grammar must work with the scanner's token stream.
**Effort**: N/A (not viable)

---

### Recommendation

**Approach 1** — choice-based restructure with `event_body` wrapper. It's the cleanest option, fully backward compatible, requires no scanner changes, and gives consumers a queryable named wrapper. The per-line `event_statement` enables future features like syntax highlighting per line or folding the entire body.

### Detailed Grammar Design

```js
// ────────── Modified ──────────
event_binding: $ => seq(
    field('event', $.event_name),
    ':',
    choice(
        field('handler', $.property_value),
        field('handler', $.event_body),
    ),
),

// ────────── New Rules ──────────

// Event body: indented Python code block
event_body: $ => seq(
    $._indent,
    repeat(choice(
        $.event_statement,
        seq($.comment, optional($._newline)),
    )),
    $._dedent,
),

// Single line of Python code inside handler body
event_statement: $ => seq(
    token(/[^\n\r]+/),
    optional($._newline),
),
```

### New Test Cases

Add to `test/corpus/core-syntax.txt`:

**1. Basic multiline event binding:**
```kv
BoxLayout:
    on_press:
        root.manager.transition.direction = 'right'
        root.manager.current = 'menu'
```
Expected:
```
(source_file
  (root_rule
    name: (identifier)
    (event_binding
      event: (event_name)
      handler: (event_body
        (event_statement)
        (event_statement)))))
```

**2. Single-statement multiline body:**
```kv
Button:
    on_release:
        root.cleanup()
```
Expected:
```
(source_file
  (root_rule
    name: (identifier)
    (widget_declaration
      name: (identifier)
      (event_binding
        event: (event_name)
        handler: (event_body
          (event_statement))))))
```

**3. Inline form still works (backward compat — could use existing test):**
Already covered by `Event binding — on_press` at lines 104-119.

**4. Multiline followed by another declaration:**
```kv
BoxLayout:
    on_press:
        root.handle()
    text: "hello"
```
Expected:
```
(source_file
  (root_rule
    name: (identifier)
    (event_binding
      event: (event_name)
      handler: (event_body
        (event_statement)))
    (property
      name: (identifier)
      value: (property_value
        (string)))))
```

### Backward Compatibility

- Existing tests for inline `event_binding` (`core-syntax.txt` lines 104-136) must pass unchanged
- The `choice()` puts `property_value` first, so existing behavior is preserved
- The field name `handler` is unchanged for the inline form
- No changes to scanner, existing indent/dedent logic unaffected

### Risks

- **None with the grammar itself**. The only risk is if consumers (e.g., kivy-language-server or highlight queries) inspect `event_binding` children and break when encountering `event_body` instead of `property_value`. This is a forward-compatibility concern, not a bug.
- **Zero risk to existing parses** — the inline form is fully preserved.
- **No scanner risk** — the existing indent/dedent mechanism is already proven by `_rule_body` and `canvas_block`.

### Ready for Proposal

Yes. The design is straightforward, backward compatible, and requires no scanner changes. The orchestrator can proceed to the proposal phase with confidence.
