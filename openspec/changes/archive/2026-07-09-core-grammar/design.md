# Design: core-grammar

## Technical Approach

Minimal external C scanner (INDENT/DEDENT/NEWLINE only) + full grammar rules in `grammar.js` — same pattern as tree-sitter-python. Scanner handles indentation tracking; grammar handles all kvlang structure. Property values captured as raw text (no Python expression parsing).

## Architecture

```
┌───────────────────────────────────────────────────┐
│                  tree-sitter-kivy                  │
│                                                    │
│  grammar.js ──tree-sitter generate──▶ src/parser.c │
│       │                                            │
│       │ (externals)                                │
│       ▼                                            │
│  src/scanner.c ──── compiled together ────▶ parser  │
│       │                                            │
│       │ tracks: indent_stack[], column count        │
│       │ emits: INDENT, DEDENT, NEWLINE              │
│                                                    │
│  test/corpus/*.txt ──tree-sitter test──▶ assertions │
└───────────────────────────────────────────────────┘
```

## Architecture Decisions

### Decision: External scanner scope

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Full external lexer (YAML style) | Destroys error recovery, ~1000+ lines C | ❌ Rejected |
| Minimal scanner (Python style) | ~120 lines C, good error recovery | ✅ Chosen |
| No scanner | Impossible — indentation requires tracking | ❌ Rejected |

### Decision: Values as raw text

Property values are everything after `:` to end-of-line. No Python expression parsing. Keeps the grammar 100% regex-parseable and avoids pulling in a Python parser.

## Scanner (`src/scanner.c`) Design

### Token types
```c
enum TokenType {
  NEWLINE,   // line separator inside blocks
  INDENT,    // block start (indentation increased)
  DEDENT,    // block end (indentation decreased)
  BREAK,     // rule separator at top level (skips comments/blanks between rules)
};
```

### Data structure
```c
#define MAX_INDENT_STACK 32

typedef struct {
    int32_t depth;              // current stack depth (0 = initial)
    int32_t indent_stack[MAX_INDENT_STACK];  // column positions per level
} Scanner;
```

### Lifecycle — 5 required functions

| Function | Purpose |
|----------|---------|
| `create()` | malloc+zero a Scanner; push initial indent 0 |
| `destroy()` | free the Scanner |
| `serialize()` | write indent_count + stack to buffer (cap at MAX_INDENT_STACK) |
| `deserialize()` | restore state from buffer (cap read at MAX_INDENT_STACK entries) |
| `scan()` | called per external token request; the core logic |

**Buffer safety**: `serialize()` MUST cap `indent_count` at `MAX_INDENT_STACK` before writing. `deserialize()` MUST cap reads to `MAX_INDENT_STACK` entries. If `deserialize()` receives a buffer with `indent_count > MAX_INDENT_STACK`, reset to clean state (stack = {0}) rather than truncating silently — losing incremental parse state is safer than propagating corrupted indentation.

### Scan logic (detailed)

```
scan(lexer, valid_symbols):

  // --- Step 0: Handle _break requests (top-level rule separator) ---
  if valid_symbols[BREAK]:
    // Skip inline whitespace
    while lexer->lookahead is ' ', '\t', '\r':
      advance(lexer, skip=true)
    // Skip blank/comment lines until content or EOF
    while lexer->lookahead is '\n' or '#' or '\r' or EOF:
      if lexer->lookahead is '\n':
        advance(lexer, skip=false)
      else if lexer->lookahead is '#':
        consume_entire_line()  // advance until \n or EOF
      else if lexer->lookahead is '\r':
        advance(lexer, skip=true)
      else if lexer->lookahead is EOF:
        // If lines were consumed, accept (token is invisible to grammar)
        // If nothing consumed, return false (no _break needed)
        break
    // After skipping, if we consumed anything → return true (accept _break)
    // If cursor is at content already → return false (no break needed)
    return consumed_at_least_one_blank_or_comment_line

  // --- Step 1: Skip inline whitespace for indent tracking ---
  while lexer->lookahead is ' ' or '\t':
    advance(lexer, skip=true)
  if lexer->lookahead is '\r':
    // Lone \r (old Mac) — treat as newline equivalent
    // Note: Windows \r\n is handled by step 2 consuming \n, \r is consumed
    // here as whitespace first. This means old Mac \r-only is NOT supported.
    // \r-only detection would require restructured scanner.
    advance(lexer, skip=true)

  // --- Step 2: LOOP — skip blank and comment lines ---
  col = 0   // column position of the content line (will be measured)
  while true:
    switch lexer->lookahead:
      case '\n':
        advance(lexer, skip=false)
        // Count leading whitespace on the NEW line
        col = 0
        while lexer->lookahead is ' ' or '\t':
          if lexer->lookahead is '\t':
            col = (col / 8 + 1) * 8  // advance to next tab stop (PEP 8)
          else:
            col += 1
          advance(lexer, skip=true)
        // Classify the line by what follows the whitespace
        if lexer->lookahead is '#':
          consume_entire_line()     // comment line → skip
          continue
        if lexer->lookahead is '\n' or lexer->lookahead is EOF:
          continue                  // blank line → skip
        if lexer->lookahead is '\r':
          advance(lexer, skip=true)
          continue                  // blank line (\r) → skip
        // Content line found! col holds the column position.
        break  // exit loop
      case '#':
        // File starts with # (no preceding newline consumed)
        consume_entire_line()
        continue
      case '\r':
        // Lone \r (not followed by \n) — possible old Mac line ending
        // For simplicity, skip and continue. \r-only NOT fully supported.
        advance(lexer, skip=true)
        continue
      case EOF:
        break  // EOF handling below
      default:
        // Content character at position 0 (no preceding newline)
        col = 0
        break
    break  // exit loop

  // --- Step 3: Handle EOF ---
  if lexer->lookahead is EOF:
    // Pop one DEDENT per call, checking valid_symbols.
    // scanner->depth is the current stack depth (set during push/pop operations).
    if valid_symbols[NEWLINE] and scanner->depth == 0:
      // Top-level EOF — just return false (file is done)
      return false
    if valid_symbols[NEWLINE]:
      // Parser expects a newline (e.g., after last declaration before DEDENT)
      emit NEWLINE, return true
    if scanner->depth > 1 and valid_symbols[DEDENT]:
      // Parser expects DEDENT
      scanner->depth -= 1
      emit DEDENT, return true
    if valid_symbols[INDENT]:
      // Parser expects INDENT (empty body after rule header at EOF)
      emit NEWLINE, return true   // signals empty body
    // Nothing valid → return false (parser will see EOF naturally)
    return false

  // --- Step 4: col already computed in step 2 ---
  stack_top = scanner->depth > 0
    ? scanner->indent_stack[scanner->depth - 1]
    : 0
  // Compare column vs stack top:
  if col == stack_top:
    emit NEWLINE, return true
  if col > stack_top:
    scanner->depth += 1
    scanner->indent_stack[scanner->depth - 1] = col
    emit INDENT, return true
  if col < stack_top:
    scanner->depth -= 1
    emit DEDENT, return true
    // Multiple DEDENTs require multiple scan() calls (one per level)
```

**CRITICAL**: 
- The scanner MUST check `valid_symbols` to determine which token type is being requested. The `_break` (BREAK) token uses a separate code path from indent comparison (step 0 vs steps 2-5).
- `#` at file start (byte 0) is handled explicitly via `case '#'` in step 2. Without this, the file-start comment falls through to `default` and is treated as content.
- Whitespace counting happens in step 2 during line classification — the count is stored in `col` (not in the struct field `depth`) and used in step 4. Duplicate counting is eliminated.
- The struct field `depth` tracks stack depth (how many levels are on the stack). The local variable `col` tracks column position. These are distinct — do NOT confuse them.
- The scanner emits ONE token per `scan()` call. At EOF with multiple DEDENTs needed, the parser calls `scan()` repeatedly (once per DEDENT) until the scanner returns false.
- Step 3 (EOF) checks `valid_symbols[NEWLINE]` before emitting NEWLINE, ensuring the token is actually valid at that parser state.

Key simplification vs Python: **no bracket awareness**. Property values are single-line, so parentheses/brackets/braces inside values don't affect indentation tracking. The scanner only cares about column position after newlines.

### Comments model

Comments are **consumed by the external scanner** — they are invisible to the grammar and do NOT produce COMMENT nodes in the parse tree. The `_break` external token invokes the scanner between rules at level 0, consuming comment/blank lines before each rule.

This means:
- The parse tree will NOT contain comment nodes (consumers like highlighters must use tree-sitter queries against other grammars or external tools for comment content)
- Comments inside rule bodies are consumed during NEWLINE/INDENT/DEDENT scan requests
- Comments at top level are consumed via `_break` requests
- A comment-only file produces `source_file` with zero children, no ERROR

**Spec clarification**: The spec's statement "comments consumed as tokens" means they are consumed as input (not producing parse ERROR), not that they produce CST tokens. The scanner consumes and discards them.

### C function naming convention

The five external scanner functions MUST use exact names matching the grammar name:

```c
void *tree_sitter_kivy_external_scanner_create();
void tree_sitter_kivy_external_scanner_destroy(void *);
bool tree_sitter_kivy_external_scanner_scan(void *, TSLexer *, const bool *);
unsigned tree_sitter_kivy_external_scanner_serialize(void *, char *);
void tree_sitter_kivy_external_scanner_deserialize(void *, const char *, unsigned);
```

Where `kivy` comes from `name: 'kivy'` in `grammar.js`. If the grammar name changes, the prefix changes accordingly.

## Grammar (`grammar.js`) Structure

### Extras
```javascript
extras: $ => [/[ \t]/] // internal whitespace — excludes \n (newlines handled by external scanner)
```

**CRITICAL**: `\n` MUST be excluded from extras. If `\n` is in extras, the internal scanner consumes it before the external scanner can track indentation, causing property values to eat the next line and breaking NEWLINE tracking. All line boundaries are guarded by external tokens (NEWLINE, INDENT, DEDENT).

### External tokens
```javascript
externals: $ => [
  $._newline,   // line separator inside blocks
  $._indent,    // block start (indentation increased)
  $._dedent,    // block end (indentation decreased)
  $._break,     // rule separator at top level (invokes scanner to skip comments/blanks)
]
```

### Rule hierarchy

```
source_file
  └── repeat(seq(optional(_break), _rule))   ← _break invokes scanner for top-level
        ├── _break                           external token (scanner skips comments/blanks)
        ├── root_rule                        "Name:"
        │     └── optional(_rule_body)
        └── class_rule                       "<Name>:"
              └── optional(_rule_body)
                    ├── _newline             ← empty body (no content)
                    └── seq(                 ← non-empty body
                          _indent,
                          repeat(_declaration),
                                ├── property           "key: value"
                                ├── event_binding      "on_event: stmt"
                                ├── id_declaration     "id: bare_name"
                                └── widget_declaration  "ChildName:"
                                      └── optional(_rule_body)  ← recursive, may be empty
                          _dedent)
```

**CRITICAL**: Comments and blank lines at level 0 (between rules) need the scanner to be invoked. The `_break` external token provides this: the grammar requests `_break` before each `_rule`, the scanner sees the call (step 0), consumes any comment/blank lines, and emits BREAK (which the grammar consumes as a separator node). Without `_break`, the internal scanner would see `#` or `\n` at level 0 with no matching rule → ERROR node.

`_break` is NOT synonymous with NEWLINE. The scanner emits BREAK (a distinct token type) when `valid_symbols[BREAK]` is true. The scan logic for BREAK never falls through to indent comparison — it uses a separate code path (step 0).

**CRITICAL**: `widget_declaration` does NOT include its own `$._newline` — the `_rule_body` handles both empty (NEWLINE) and non-empty (INDENT...DEDENT) cases. Only `property`, `event_binding`, and `id_declaration` include `$._newline`.

**CRITICAL**: `_rule_body` MUST be `optional()` in all rule types. Widget siblings like:
```kv
BoxLayout:
    Button:
    Label:
```
...require `Button:` and `Label:` to parse without bodies. Without `optional()`, the grammar expects INDENT after `Button:` but finds `Label:` at the same indent (NEWLINE), causing parse failure.

**CRITICAL**: The `_newline` alternative handles empty/comment-only bodies. When the scanner finds EOF after a rule header (or only comment/blank lines), it emits NEWLINE to signal an empty body. When the grammar sees NEWLINE after a rule header, it produces a zero-child block.
```

### How NEWLINE works

Each declaration line ends with NEWLINE. Within a `_rule_body`, each declaration pattern (`property`, `event_binding`, `id_declaration`, `widget_declaration`) MUST include `$._newline` as its final element:

```javascript
property: $ => seq(field('name', $.identifier), ':', field('value', $.property_value), $._newline)
```

Without explicit NEWLINE in each pattern, `repeat(_declaration)` would never advance past the first declaration (no boundary token), causing infinite loops or wrong trees.

When indentation changes, the scanner emits INDENT or DEDENT instead of NEWLINE, signaling block boundaries.

For empty bodies (comment-only or EOF after header), the scanner emits NEWLINE which matches the `_newline` alternative in `_rule_body`, producing a zero-child block without requiring INDENT/DEDENT.

### Declaration grammar rules

```javascript
// Property: key: value on the same line
property: $ => seq(
  field('name', $.identifier),
  ':',
  field('value', $.property_value),
  $._newline
)

// Event binding: on_event: statement
event_binding: $ => seq(
  'on',
  '_',
  field('event', $.identifier),
  ':',
  field('handler', $.property_value),
  $._newline
)

// ID: id: bare_name (NOT a quoted string in spec, but accept both)
id_declaration: $ => seq(
  'id',
  ':',
  field('name', choice($.identifier, $.string)),
  $._newline
)
```

| Declaration | Value capture |
|-------------|---------------|
| Property | `token.immediate(/[^\n\r]+/)` — raw text to newline |
| Event binding | Same `token.immediate(/[^\n\r]+/)` — raw Python expression |
| ID | `$.identifier` (bare word) or `$.string` (quoted, matching real Kivy behavior) |

**CRITICAL**: Property values MUST use `token.immediate(...)` with `[^\n\r]` (not `.`). Since `\n` is excluded from extras, the value token must be marked `immediate` so the internal scanner doesn't consume leading whitespace on the same line before matching. Without `immediate`, whitespace between `:` and the value would be consumed by extras, and the value rule would start matching at unexpected positions.

**CRITICAL**: The `on_` prefix in event bindings is matched as three tokens: `'on' '_' $.identifier`. This keeps the event name as a separate child node in the CST. Tree-sitter's string token matching is prioritized over named rules in `choice()` contexts.

**Ambiguity notes**: 
- `property` and `widget_declaration` both start with `identifier ':'`. Disambiguation via GLR `choice()`:
  - If `:` is followed by content (non-newline) on the same line → `property`
  - If `:` is followed immediately by NEWLINE → `widget_declaration`
- `id:` without a value is ambiguous between `id_declaration` (fails at missing value) and `widget_declaration` (name "id", empty body). The GLR parser converges on `widget_declaration`, so `id:` parses as a widget named "id" rather than an error. This is a known edge case.
- Inline comments after widget headers (`Button: # comment`) will match `property` (text after colon). Documented limitation — avoid inline comments after widget declarations.

Widget declarations reuse `_rule_body` recursively, enabling arbitrary nesting.

## File Layout (after `tree-sitter init`)

```
tree-sitter-kivy/
├── grammar.js              ← We write this
├── tree-sitter.json        ← Generated by init
├── package.json            ← Already exists (merged)
├── Cargo.toml              ← Generated by init
├── src/
│   ├── parser.c            ← Generated by tree-sitter generate
│   ├── scanner.c           ← We write this (external scanner)
│   ├── tree_sitter/        ← Generated headers
├── test/
│   └── corpus/
│       └── core-syntax.txt ← We write this (corpus tests)
├── bindings/               ← Generated by init
```

## Testing Strategy

| Layer | What | How |
|-------|------|-----|
| Corpus tests | All spec GIVEN/Expectation rows | `tree-sitter test` with `.txt` format |
| Iterative | Write 1-2 tests → generate → build → test → fix | Per test file edit |

Corpus tests progress:

| # | Test case | Spec ref |
|---|-----------|----------|
| 1 | Empty file (zero rules) | SF-1 |
| 2 | Comment-only file (no ERROR) | SF-2 |
| 3 | Root rule header `BoxLayout:` | RH-1 |
| 4 | Class rule `<MyButton>:` | RH-2 |
| 5 | Root rule missing colon | RH-3 |
| 6 | Rule body with property | RB-1 |
| 7 | Rule body empty (header only) | RB-2 |
| 8 | Property assignment text + expression | DL-1, DL-2 |
| 9 | Event binding `on_press:` | DL-4 |
| 10 | ID declaration bare name | DL-5 |
| 11 | ID with quotes (accepted per real Kivy) | DL-relax |
| 12 | Missing colon in declaration | DL-7 |
| 13 | Child widget inside parent | CW-1 |
| 14 | Nested widgets (2+ levels) | CW-ext |
| 15 | Comments inside rule body | CB-1 |
| 16 | Blank lines between declarations | CB-2 |
| 17 | Blank lines between top-level rules | — |
| 18 | Windows `\r\n` line endings | — |
| 19 | Mixed indentation error (4→6 spaces) | IL-2 |
| 20 | Tab indentation (= 8 spaces) | IL-3 |
| 21 | Tabs vs spaces at same level (ERROR) | IL-ext |
| 22 | Comment at byte 0, zero rules | EDGE |
| 23 | Indentation bounce (4→2→4→0) | EDGE |
| 24 | `id:` without value (edge case) | EDGE |

## Open Questions

- **Tabs**: normalize to 8 spaces using Python's approach (each tab advances to next multiple of 8). Mixed tabs+spaces produce best-effort ERROR (after normalization, `\t` and `        ` are indistinguishable).
- **Serialization corruption**: If `deserialize()` receives a buffer with `indent_count > MAX_INDENT_STACK`, reset to clean state (stack = {0}) rather than truncating silently. Loss of incremental parsing state is better than corrupt indentation tracking.
