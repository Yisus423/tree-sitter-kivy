# Design: Directives

## Technical Approach

Extend the existing C scanner (`src/scanner.c`) to distinguish `#:` from plain `#` using a **consume-then-decide pattern** — advance past `#`, check `lookahead` for `:`, branch accordingly. Add `DIRECTIVE_START` to the external token enum. Modify `grammar.js` to accept directive rules at `source_file` level via `choice(directive, seq(optional(_break), _rule))`.

The scanner emits DIRECTIVE_START for ANY `#:` at column 0 — the grammar enforces "file-start only" positioning. Plain `#` comments remain consumed and discarded.

## Architecture Decisions

### Decision: Peek strategy (consume-then-check)

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Option A — Remove `#` from BREAK loop entirely | BREAK skips `\n` only; `#:` lines survive for parser to try DIRECTIVE_START. BUT: plain `#` at byte 0 returns false from scan() with `#` still unconsumed → parser sees `#` and tries other rules → scanner called again with DIRECTIVE_START invalid — consumes `#` as raw char → ERROR. The parser never has a chance to try DIRECTIVE_START for plain `#` because it would have to try that token FIRST. | ❌ Rejected — breaks plain `#` comment lines |
| Option B — Consume-then-check: advance past `#`, check for `:`, set state flag | Works for both BREAK and `\n` skip loops. When `#:` found, consume both chars as part of scanner state and sto/emit DIRECTIVE_START. When plain `#` found, the single consumed `#` byte is safe (advance_line continues from that position). | ✅ Chosen |

**Rationale**: `TSLexer` has no peek-ahead. The only way to inspect the next byte is `advance()` then check `lookahead`. This is exactly how tree-sitter-python's scanner checks for escaped quotes — advance, then examine. The consumed `#` byte for plain comments is harmless because `advance_line()` starts from wherever the cursor is and eats to end-of-line.

### Decision: DIRECTIVE_START on ANY `#:` at column 0

| Option | Tradeoff | Decision |
|--------|----------|----------|
| File-start tracking only | Adds `bool has_seen_content` to Scanner struct, serialization complexity | ❌ Rejected |
| Always-on at column 0 | Simple — scanner emits DIRECTIVE_START for any `#:`. Grammar only accepts it at source_file level. Inside a block, the parser never requests DIRECTIVE_START, so `#:` falls through to internal scanner → consumed as property_value or ERROR content. | ✅ Chosen |

**Why**: Spec says directives are only valid at file start. The grammar enforces this naturally: `source_file` includes `directive` in its `choice()`, but inside `_rule_body` there is no `directive` alternative. If `#:` appears inside a block, the parser is not requesting DIRECTIVE_START, so the scanner never fires for it — the `#` simply gets consumed by whatever path is active (NEWLINE skip or fallthrough). No crashes, spec satisfied.

### Decision: `directive_value` uses `token.immediate`

**Choice**: `directive_value: $ => token.immediate(/[^\n\r]+/)` — same pattern as `property_value`.

**Why**: Since `\n` is excluded from extras, whitespace between the directive keyword and its value (`#:import   Button   kivy.uix.button`) needs to be consumed by extras before `directive_value` matches. The `immediate` marker prevents extra whitespace from being consumed after the keyword token, and the regex captures everything to end-of-line.

## Data Flow

```
Input stream:
  #:import Button kivy.uix.button\nBoxLayout:\n    text: "hi"\n

Scanner sees (via \n skip loop or BREAK):
  ┌─ '#' → advance() → lookahead == ':' → advance() → emit DIRECTIVE_START
  │
  └─ returns true, cursor after "#:" 

Parser receives DIRECTIVE_START, tries directive rules:
  $._directive_start → 'import' → $.identifier("Button") → $.directive_value → $._newline
                                                        └─ "kivy.uix.button"

Scanner called again (BREAK for next rule):
  ┌─ '\n' → consume (skip=false) → count leading whitespace → col=0
  ├─ 'B' → content at col 0 → compare indent levels → NEWLINE (or INDENT for body)
  │
  Plain # comments:
    ┌─ '#' → advance() → lookahead != ':' → advance_line() → loop continues
    │   (both BREAK and \n skip paths)
```

## Scanner Changes

### New token type

```c
enum TokenType {
    NEWLINE,
    INDENT,
    DEDENT,
    BREAK,
    DIRECTIVE_START,  // NEW
};
```

### Helper function

```c
// Consume the rest of a comment line (after '#' has been consumed).
// Returns true if ':' was found at the immediate next position.
static bool try_directive_start(TSLexer *lexer) {
    // '#' has already been consumed by caller — check what follows
    if (lexer->lookahead == ':') {
        lexer->advance(lexer, false);  // consume ':'
        return true;
    }
    // Plain '#' — consume rest of line
    advance_line(lexer);
    return false;
}
```

### BREAK path modification (Step 0b)

```c
if (valid_symbols[BREAK] && !valid_symbols[NEWLINE] && ...) {
    // Skip whitespace before blanks
    while (lexer->lookahead == ' ' || lexer->lookahead == '\t' || lexer->lookahead == '\r') {
        lexer->advance(lexer, true);
    }

    bool consumed = false;
    while (lexer->lookahead == '\n' || lexer->lookahead == '#') {
        if (lexer->lookahead == '\n') {
            consumed = true;
            lexer->advance(lexer, true);
            continue;
        }
        if (lexer->lookahead == '#') {
            lexer->advance(lexer, false);  // consume '#'
            if (lexer->lookahead == ':') {
                // We found '#:' during BREAK — emit DIRECTIVE_START
                lexer->advance(lexer, false);  // consume ':'
                lexer->result_symbol = DIRECTIVE_START;
                return true;
            }
            // Plain '#' — consume rest of line, loop continues
            advance_line(lexer);
            consumed = true;
            continue;
        }
    }
    ...
}
```

### `\n` skip loop modification (Step 2)

```c
while (lexer->lookahead == '\n' || lexer->lookahead == '#' || lexer->lookahead == '\r') {
    if (lexer->lookahead == '\n') {
        // ... existing blank line handling ...
    } else if (lexer->lookahead == '#') {
        lexer->advance(lexer, false);  // consume '#'
        if (lexer->lookahead == ':') {
            // Found directive during \n skip — we're in the middle of
            // indentation tracking. DIRECTIVE_START emission is handled
            // by the dedicated path below (step 1b). For the \n skip
            // loop, we need to bail out and let the dedicated path handle it.
            // BUT: since we already consumed '#', we need to handle this.
            // ACTUALLY: the \n skip loop always has precedence over
            // DIRECTIVE_START because DIRECTIVE_START isn't valid here.
            // This means during \n skip processing, if we find ':', we
            // should NOT emit DIRECTIVE_START — we need to consume ':'
            // and the rest of the line as if it were a plain comment.
            // The directive will be caught by the BREAK path (if at top level)
            // or by the comment/error path (if inside a body).
            advance_line(lexer);  // consume rest of line
            continue;
        }
        advance_line(lexer);  // plain comment, consume rest
        continue;
    } else if (lexer->lookahead == '\r') {
        lexer->advance(lexer, true);
    }
}
```

**CRITICAL insight**: The `\n` skip loop (Step 2) fires during NEWLINE/INDENT/DEDENT processing, NOT during BREAK. Directives are only at column 0. If `DIRECTIVE_START` is not in `valid_symbols` (which it won't be during indent processing — only during `source_file` level), we should NOT emit it. Instead, `#:` in this context gets consumed as comment content. This is exactly the right behavior: `#:` inside a rule body simply gets consumed as a comment line (preserving backward compat).

### Dedicated DIRECTIVE_START handler (new Step 1b)

Added BEFORE step 1 (inline whitespace), AFTER step 0b (BREAK):

```c
// ---------------------------------------------------------------
// Step 0c: Handle DIRECTIVE_START requests
// Only checked when DIRECTIVE_START is a valid symbol.
// This fires when the parser has entered source_file and is
// trying to match a directive before a rule.
// ---------------------------------------------------------------
if (valid_symbols[DIRECTIVE_START]) {
    // '#' at column 0 is expected. Skip leading whitespace.
    while (lexer->lookahead == ' ' || lexer->lookahead == '\t') {
        lexer->advance(lexer, true);
    }
    if (lexer->lookahead == '#') {
        lexer->advance(lexer, false);  // consume '#'
        if (lexer->lookahead == ':') {
            lexer->advance(lexer, false);  // consume ':'
            lexer->result_symbol = DIRECTIVE_START;
            return true;
        }
        // Plain '#' following a newline and whitespace at the beginning of a line.
        // Parser was expecting directive but found plain comment.
        advance_line(lexer);
        // Return false — parse will try other alternatives (BREAK + rule)
        return false;
    }
    // Not '#' — return false, parser tries other alternatives
    return false;
}
```

**IMPORTANT**: Step 0c runs ONLY when `valid_symbols[DIRECTIVE_START]` is true. The parser only requests this token at the `source_file` level (when trying to match `$.directive`). Inside blocks, `DIRECTIVE_START` is not a valid symbol, so this step is skipped entirely — `#:` inside bodies falls through to normal comment handling.

### Scan() ordering (execution order)

```
Step 0:  Pending DEDENT (unchanged)
Step 0b: BREAK path — now handles #: by emitting DIRECTIVE_START
Step 0c: DIRECTIVE_START path — new, fires at source_file level
Step 1:  Skip inline whitespace (unchanged)
Step 2:  \n processing (modified: #: consumed as comment in this path)
Step 3:  EOF (unchanged)
Step 4:  Content char fallthrough (unchanged)
```

## Grammar Changes

### External token addition

```javascript
externals: $ => [
    $._newline,
    $._indent,
    $._dedent,
    $._break,
    $._directive_start,  // NEW
],
```

### source_file modification

```javascript
source_file: $ => seq(
    repeat(choice(
        $.directive,
        seq(optional($._break), $._rule),
    )),
    optional($._break),
),
```

### Directive rules

```javascript
directive: $ => choice(
    $.import_directive,
    $.set_directive,
    $.kivy_directive,
),

import_directive: $ => seq(
    $._directive_start,
    'import',
    field('alias', $.identifier),
    field('module', $.directive_value),
    $._newline,
),

set_directive: $ => seq(
    $._directive_start,
    'set',
    field('name', $.identifier),
    field('value', $.directive_value),
    $._newline,
),

kivy_directive: $ => seq(
    $._directive_start,
    'kivy',
    field('version', $.directive_value),
    $._newline,
),

directive_value: $ => token.immediate(/[^\n\r]+/),
```

**`_newline` at end of directive**: Each directive MUST end with `$._newline` to consume the line terminator. Without this, the scanner would still have a `\n` in its lookahead after the directive, which would then be consumed by the next scanner call as a blank line leading to an extra BREAK or NEWLINE.

### ERROR recovery for malformed directives

- `#:unknown args`: DIRECTIVE_START matches, `'unknown'` doesn't match `import`/`set`/`kivy` → GLR tries alternatives → ERROR at directive level
- `#:import` with no alias: DIRECTIVE_START + `'import'` match, `$.identifier` finds nothing → `\n` is not a valid identifier → ERROR
- `#:set` with no name: same as above
- `#:import :Button` (colon after import without alias): DIRECTIVE_START + `'import'` match, `:` is not an identifier → ERROR

**No `$._newline` in ERROR recovery for directives**: When a malformed directive produces an ERROR, tree-sitter's GLR recovery will skip tokens until it finds a valid boundary. The `$._newline` at the end of each directive ensures that even ERROR paths will terminate at the line boundary.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/scanner.c` | Modify | Add DIRECTIVE_START enum + scan logic changes |
| `grammar.js` | Modify | Add externals + directive rules + source_file changes |
| `test/corpus/directives.txt` | New | Corpus tests for all directive cases |

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Corpus | All spec GIVEN/Expectation rows from kvlang-directives spec | `tree-sitter test` with `test/corpus/directives.txt` |
| Corpus | All 24 existing core-syntax tests still pass | `tree-sitter test` — verify no regressions |

### New corpus test file: `test/corpus/directives.txt`

```
==================
Single #:import directive
==================
#:import Button kivy.uix.button

---

(source_file
  (import_directive
    alias: (identifier)
    module: (directive_value)))

==================
Single #:set directive
==================
#:set root_color 1 0 0 1

---

(source_file
  (set_directive
    name: (identifier)
    value: (directive_value)))

==================
Single #:kivy directive
==================
#:kivy 2.3.1

---

(source_file
  (kivy_directive
    version: (directive_value)))

==================
Multiple directives in sequence
==================
#:import A a.b
#:set x 1
#:kivy 2.0

---

(source_file
  (import_directive
    alias: (identifier)
    module: (directive_value))
  (set_directive
    name: (identifier)
    value: (directive_value))
  (kivy_directive
    version: (directive_value)))

==================
Directives with blank lines between them
==================
#:import A a.b

#:set x 1

---

(source_file
  (import_directive
    alias: (identifier)
    module: (directive_value))
  (set_directive
    name: (identifier)
    value: (directive_value)))

==================
Directive immediately followed by rule (no blank line)
==================
#:import B b.c
BoxLayout:

---

(source_file
  (import_directive
    alias: (identifier)
    module: (directive_value))
  (root_rule
    name: (identifier)))

==================
Directive followed by blank lines then rule
==================
#:kivy 2.1.0

BoxLayout:

---

(source_file
  (kivy_directive
    version: (directive_value))
  (root_rule
    name: (identifier)))

==================
File with only directives (zero rules)
==================
#:import A a.b
#:set x 1

---

(source_file
  (import_directive
    alias: (identifier)
    module: (directive_value))
  (set_directive
    name: (identifier)
    value: (directive_value)))

==================
Malformed directive — unknown keyword
==================
#:unknown some args

---

(source_file
  (ERROR))

==================
Malformed directive — #:import missing arguments
==================
#:import

---

(source_file
  (ERROR))

==================
Malformed directive — #:set missing name
==================
#:set

---

(source_file
  (ERROR))

==================
Plain # comment still works (backward compat)
==================
# just a comment
BoxLayout:

---

(source_file
  (root_rule
    name: (identifier)))

==================
#: inside rule body — no crash, consumed as content
==================
BoxLayout:
    value: something #: not a directive

---

(source_file
  (root_rule
    name: (identifier)
    (property
      name: (identifier)
      value: (property_value))))
```

## Open Questions

- [ ] **`#:import` with `from x import y` syntax**: Real Kivy supports `#:import some_name from x.y import SomeClass`. The spec intentionally simplified this to `alias module` format. If real-world files use `from ... import` syntax, we'll need to handle it as a value-only fallback (no alias field) or extend the grammar.
- [ ] **Empty directive value edge case**: `#:kivy` with no version or `#:import A` with no module — both produce ERROR via grammar fallback. Acceptable per spec.
- [ ] **`\r\n` line endings in directives**: `advance_line()` handles `\r\n` correctly (advances past `\r`, then checks `\n`, advances past `\n`). No change needed for DIRECTIVE_START path — after consuming `#:`, the rest is grammar-level (keyword + identifier + `directive_value + _newline`).