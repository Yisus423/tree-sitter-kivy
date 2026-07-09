# Exploration: Kivy KV Language (kvlang) Grammar for Tree-sitter

## Current State

The project is a blank scaffold. `bun init` created a TypeScript project with `tree-sitter-cli 0.26.10` as a dev dependency. There is no `grammar.js`, no `src/parser.c`, no tests, and no `tree-sitter.json`. The project has NOT run `tree-sitter init`, meaning the expected tree-sitter project structure is missing.

The openspec config already documents the context: strict TDD is marked `true` but is effectively gated behind the first scaffold phase. The build command will be `tree-sitter build --wasm`, test command `tree-sitter test`.

---

## What is kvlang?

Kivy's KV Language (kvlang) is a **declarative, indentation-based** language for describing Kivy widget trees, property bindings, event handlers, and canvas graphics instructions. It lives in `.kv` files and is loaded alongside Python `.py` files.

### 1. File-Level Directives

Directives start with `#:` and must appear at the top of the file (before any rules):

```kv
#:kivy 2.3.1                  # (deprecated) Kivy version requirement
#:import name x.y.z           # Python import: from x.y import z as name
#:import isdir os.path.isdir  # Python import: from os.path import isdir
#:import np numpy              # Python import: import numpy as np
#:set name value              # Global variable assignment
```

Plain comments (non-directive) use `#`:

```kv
# This is a regular comment
```

### 2. Rule Types (Top-Level Constructs)

A KV file contains exactly **one root rule** and any number of class rules, dynamic classes, or templates.

#### Root Rule (no angle brackets — appends to App.root)

```kv
BoxLayout:
    orientation: 'vertical'
```

#### Class Rule (angle brackets — applies to ALL instances)

```kv
<MyWidget>:
    size_hint: (0.5, 0.5)
    pos_hint: {'center_x': 0.5, 'center_y': 0.5}
```

#### Multi-Class Rule (comma-separated — shared style)

```kv
<MyFirstWidget,MySecondWidget>:
    Button:
        on_press: root.do_action()
    Label:
        id: status_label
```

#### Dynamic Class (creates a new class at parse time)

```kv
<MyBigButton@Button>:
    text_size: self.size
    font_size: '25sp'
    markup: True
```

#### Template (square brackets — deprecated/legacy)

```kv
[TemplateName@BaseClass]:
    # definitions...
```

### 3. Rule Body (Indented Block)

Inside a rule, the indented body contains:

#### Property Assignments

```kv
Label:
    text: "Hello World"
    color: (1, 0, 0, 1)
    font_size: '18sp'
    size_hint: (0.8, 0.5)
    pos_hint: {'center_x': 0.5}
    italic: True
```

Property values are **Python expressions** evaluated at runtime. They can reference:

| Keyword | Refers to |
|---------|-----------|
| `self` | Current widget instance |
| `root` | The root widget of the current rule |
| `app` | The application instance |
| `id_name` | Any widget declared with `id:` in the same rule |

#### Event Bindings

```kv
Button:
    on_press: root.do_action()
    on_release: print("released!", args)
    on_state: app.handle_state(args[1])
```

Events follow the pattern `on_<event_name>:` with a Python statement as the value.

#### ID Declarations

```kv
TextInput:
    id: my_text_input
```

**Important:** IDs are NOT strings — `id: my_text_input` (no quotes).

#### Canvas Blocks

Three canvas forms exist — default, before, and after:

```kv
Widget:
    canvas:
        Color:
            rgba: (1, 0, 0, 1)
        Rectangle:
            pos: self.pos
            size: self.size

    canvas.before:
        Color:
            rgba: (0, 0, 0, 1)
        Line:
            width: 2
            points: [0, 0, 100, 100]

    canvas.after:
        Color:
            rgba: (1, 1, 1, 0.5)
```

Canvas instructions (Color, Rectangle, Line, Ellipse, Mesh, etc.) are **structurally identical** to widget declarations: they have header lines ending with `:`, indented property bodies, and can nest.

#### Child Widgets

Nesting creates the widget tree:

```kv
BoxLayout:
    orientation: 'vertical'
    padding: 20
    Button:
        text: 'Click me'
        on_press: root.handle_click()
    Label:
        id: status_label
        text: 'Ready'
```

### 4. Value Formats

Since values are Python expressions, many literal formats are valid:

```kv
# Strings (single or double quotes)
text: 'hello'
title: "world"

# Numbers
count: 42
ratio: 3.14
scale: -1.5

# Lists and tuples
items: [1, 2, 3]
position: (100, 200)
rgb: (1, 0.5, 0.3, 1)

# Dicts
props: {'key': 'value', 'count': 42}

# Property references (auto-binding)
text: root.status_message
size: self.texture_size
pos: self.center_x - self.texture_size[0] / 2, self.center_y - self.texture_size[1] / 2

# Method calls with bindings
text: str(len(root.items))

# Conditional expressions
text: 'Active' if root.is_active else 'Inactive'
```

### 5. Indentation Rules

Kivy uses **4-space indentation** (PEP 8 style). Tabs are NOT recommended but may be handled. The indentation semantics are:

- **Level 0**: File-level directives and rule headers
- **Level 1**: Properties, event bindings, canvas declarations, child widget headers
- **Level 2+**: Nested properties, canvas instruction properties, deeper children

All siblings must share the same indentation level. A child block begins at a deeper level. A block ends when a subsequent line has the **same or lesser** indentation than the block header.

---

## How Do Indentation-Sensitive Tree-Sitter Grammars Work?

### The Core Problem

Tree-sitter uses a GLR (Generalized LR) parser with a lexer that normally **skips whitespace** via the `extras` grammar property. For indentation-sensitive languages like Python and kvlang, whitespace IS meaningful — it determines block boundaries. The parser cannot "see" indentation changes through the default lexer.

### The External Scanner Solution

An **external scanner** is a hand-written C (or C++) file that runs alongside tree-sitter's default lexer. It can produce tokens that the grammar cannot describe with regular expressions. The fundamental workflow:

```
┌─────────────┐     ┌──────────────────────────┐
│  grammar.js │────▶│  tree-sitter generate     │────▶ src/parser.c
│  (DSL)      │     │  + src/scanner.c          │
└─────────────┘     └──────────────────────────┘
                           ▲
                    External scanner (C)
                    - INDENT / DEDENT / NEWLINE
                    - Maintains indent level stack
                    - Serializes/deserializes for incremental parsing
```

#### How it works:

1. **Declare external tokens** in `grammar.js`:
   ```javascript
   externals: $ => [
     $._newline,
     $._indent,
     $._dedent,
   ]
   ```

2. **Write `src/scanner.c`** that maintains an **indent stack**:
   - Measures column position after each newline
   - If indentation > stack top → emit INDENT, push to stack
   - If indentation < stack top → emit DEDENT, pop from stack
   - If indentation == stack top → emit NEWLINE

3. **Use these tokens in grammar rules**:
   ```javascript
   block: $ => seq(
     $._indent,
     repeat($._statement),
     $._dedent,
   )
   ```

4. **The scanner has 5 required C functions**:
   - `create()` — allocate state (indent stack, etc.)
   - `destroy()` — free state
   - `serialize()` — serialize state for incremental parsing bookmarks
   - `deserialize()` — restore state from bookmark
   - `scan()` — called on every external token; decides INDENT/DEDENT/NEWLINE

### Python vs. YAML — Two Scanner Strategies

| Aspect | Python (`tree-sitter-python`) | YAML (`tree-sitter-yaml`) |
|--------|-------------------------------|---------------------------|
| Scanner scope | Partial — only INDENT/DEDENT/NEWLINE + strings | Full — 100% external lexer |
| Grammar role | Full grammar rules in `grammar.js` | Minimal — scanner does all work |
| Error recovery | Good — falls back to internal lexer | Poor — whole lexer is custom |
| Complexity | Medium | Very high |
| KVlang fit | **Yes — same approach** | Overkill — kvlang is simpler than YAML |

### Python vs. Kvlang Scanner Complexity

| Feature | Python Scanner Needs | Kvlang Scanner Needs |
|---------|---------------------|---------------------|
| INDENT/DEDENT/NEWLINE | Yes | Yes |
| Bracket-aware dedent | Yes (to avoid dedenting inside `()`, `[]`, `{}`) | **No** (property values are single-line per Kivy spec) |
| String awareness | Yes (f-strings, triple-quoted) | **No** (strings stay on one line) |
| Line continuation `\` | Yes | Maybe (edge case) |
| Comment handling | Yes (# comments at any indent) | Yes (# comments + #: directives) |
| Implicit line joining | Yes (inside brackets) | **No** |
| `except` keyword awareness | Yes (for dedent before except) | **No** |

**Bottom line:** kvlang's scanner is significantly simpler than Python's. The property value being single-line removes the biggest complexity.

### Can kvlang work WITHOUT an external scanner?

**No — fundamentally not possible.** The parser must know where blocks end. Without INDENT/DEDENT tokens, tree-sitter cannot distinguish between:

```kv
BoxLayout:
    Button:         # ← child of BoxLayout
        text: "Hi"
    Label:          # ← sibling of Button (same indent)
        text: "ok"
```

versus what would be a flattened interpretation. Indentation is the ONLY block delimiter — there are no closing braces, `end` keywords, or semicolons.

---

## How Are Tree-Sitter Grammars Structured?

### Project Layout (after `tree-sitter init`)

```
tree-sitter-kivy/
├── grammar.js              # Your grammar definition (DSL)
├── tree-sitter.json        # Parser config (name, file-types, scope, etc.)
├── package.json            # npm manifest
├── Cargo.toml              # Rust bindings (if enabled)
├── bindings/               # Language bindings (rust, node, python, etc.)
│   ├── rust/
│   ├── node/
│   ├── python/
│   └── go/
├── src/                    # Generated files (from tree-sitter generate)
│   ├── parser.c            # Generated C parser
│   ├── scanner.c           # YOUR external scanner (hand-written)
│   ├── tree_sitter/
│   │   ├── parser.h
│   │   ├── alloc.h
│   │   └── array.h
│   ├── grammar.json        # JSON snapshot of grammar
│   └── node-types.json     # Node type schema
├── test/
│   └── corpus/             # Corpus test files
│       └── *.txt           # Test cases in tree-sitter format
└── queries/                # Optional: highlighting, injections, locals
    ├── highlights.scm
    ├── injections.scm
    └── locals.scm
```

### The grammar.js DSL

A `grammar.js` file exports a grammar configuration:

```javascript
/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

module.exports = grammar({
  name: 'kivy',

  // Tokens to ignore everywhere (whitespace, comments handled externally)
  extras: $ => [/\s/],

  // Tokens handled by the external scanner
  externals: $ => [
    $._newline,
    $._indent,
    $._dedent,
  ],

  // Named rules (appear in CST)
  rules: {
    source_file: $ => repeat($._definition),
    // ...
  },
});
```

#### Key DSL Functions

| Function | Purpose | Example |
|----------|---------|---------|
| `seq(a, b, c)` | Match in sequence | `seq('class', $.name, $.block)` |
| `choice(a, b)` | Match one alternative | `choice($.widget, $.property)` |
| `repeat(x)` | Zero or more | `repeat($._statement)` |
| `repeat1(x)` | One or more | `repeat1($.child)` |
| `optional(x)` | Zero or one | `optional($._else_clause)` |
| `field(name, x)` | Label a child node | `field('name', $.identifier)` |
| `token(x)` | Force as single token | `token(seq('#', /.*/))` |
| `token.immediate(x)` | Token with no whitespace allowed | `token.immediate(/\d+/)` |
| `prec(n, x)` | Set precedence | `prec.left(2, seq(...))` |
| `prec.left(n, x)` | Left-associative precedence | `prec.left(1, seq(a, '+', b))` |
| `prec.right(n, x)` | Right-associative precedence | `prec.right(1, seq(a, '=', b))` |
| `prec.dynamic(n, x)` | Dynamic precedence | `prec.dynamic(1, seq(...))` |
| `alias(x, y)` | Rename node in CST | `alias($._newline, $.line_break)` |

#### Hidden vs. Named Rules

- **`$.rule_name`** (no underscore prefix) — appears in CST
- **`$._rule_name`** (underscore prefix) — hidden, folded into parent

#### Token vs. Rule

```javascript
// token: appears as a single leaf node
comment: $ => token(seq('#', /.*/))

// rule: can have complex internal structure
binary_expression: $ => prec.left(2, seq(
  field('left', $.expression),
  field('operator', choice('+', '-')),
  field('right', $.expression),
))
```

### Corpus Test Format

Tests live in `test/corpus/*.txt` and use this format:

```
==================
Test description
==================

Source code here
(on multiple lines)

---

(expected CST structure)
(definition)
(recording)
  (child_node)
    (leaf) "value"
```

Example:

```
==================
Root widget rule
==================

BoxLayout:
    orientation: 'vertical'
    Button:
        text: "Click"

---

(source_file
  (root_rule
    (widget_name)
    (rule_body
      (property
        (property_name)
        (string_value))
      (child_widget
        (widget_name)
        (rule_body
          (property
            (property_name)
            (string_value)))))))
```

### Build & Test Workflow

```bash
# After writing grammar.js:
tree-sitter generate    # Creates src/parser.c, src/grammar.json, etc.
                        # If src/scanner.c exists, links it in

tree-sitter build       # Compiles the parser into a shared library
                        # Alias: tree-sitter build --wasm

tree-sitter test        # Runs all corpus tests

tree-sitter parse file.kv   # Parse a real file and dump the CST
tree-sitter highlight file.kv  # Syntax highlight a file

tree-sitter fuzz        # Fuzz the parser with random inputs
```

---

## Existing Similar Grammars & Parsers

### Existing kvlang Parsers

| Project | Type | Quality | Notes |
|---------|------|---------|-------|
| `kived/kvlang` | ANTLRv3 grammar | Abandoned (2014) | ANTLR-based, not tree-sitter |
| `KeyWeeUsr/kvlang` (PyPI) | Python parser | Stable (v1.0.1) | Python parsing, not tree-sitter |
| `Monk3yDev/kvlang-vscode` | VS Code ext | Active | TextMate grammar + LSP |
| `kivy-school/SwiftyKvLangVCE` | VS Code ext | Active | Swift WASM-based parser |

**There is NO existing tree-sitter-kivy grammar** — this would be the first.

### Key Reference Grammars

| Grammar | Indentation Handler | Scanner Complexity | Lines of scanner.c |
|---------|-------------------|-------------------|-------------------|
| **Python** | External INDENT/DEDENT/NEWLINE | High (brackets, strings, f-strings, `except`) | ~400 |
| **YAML** | 100% external lexer | Very High (full YAML spec) | ~1500 |
| **Nix** | Mixed — uses `{}` blocks + some indentation | Medium | ~200 |
| **Styled/Markdown** | External scanner for block nesting | Medium | ~150 |
| **Kvlang (projected)** | External INDENT/DEDENT/NEWLINE | **Low-Medium** (simpler than Python) | ~100-150 |

### Key Takeaway from tree-sitter-yaml

The YAML grammar maintainer noted that a 100% external scanner kills error recovery. They recommended using the **internal lexer as much as possible** and only using external tokens where absolutely necessary. This confirms that **kvlang should follow Python's approach** (minimal external tokens) rather than YAML's.

---

## Approach Options

### Approach A: Pure `grammar.js` — No External Scanner

**NOT FEASIBLE.** Tree-sitter cannot handle indentation-sensitive languages purely in `grammar.js`. The `extras` property defines tokens that can appear anywhere (usually whitespace), but there is no way to make whitespace conditional (emit INDENT in some contexts, skip in others) without an external scanner.

Could we fake it with different tokenization? **No.** The grammar DSL offers no mechanism to track indentation levels across tokens.

**Verdict: Dead end. Do not pursue.**

### Approach B: Minimal External Scanner + Full Grammar Rules

Like Python: the scanner handles INDENT/DEDENT/NEWLINE tokens, and all other parsing lives in `grammar.js`.

**Pros:**
- Correct indentation handling for all kvlang constructs
- Good error recovery (scanner is minimal, grammar handles errors)
- Well-established pattern — Python, Nix, and many others use this
- Simpler than Python's scanner (no bracket awareness needed for initial version)
- Easy to extend incrementally
- Grammar.js handles the complex kvlang structure (widgets, properties, canvas, etc.)
- Standard tree-sitter tooling works (highlighting, folding, etc.)

**Cons:**
- Requires writing C code (`src/scanner.c`)
- Need to implement serialize/deserialize for incremental parsing
- Need to understand tree-sitter scanner API (TSLexer, valid_symbols, etc.)
- Some edge cases (tabs vs spaces, multi-line values if Python expression spans lines)

**Effort: Medium** — ~100-150 lines of C for the scanner, ~200-400 lines of grammar.js, incremental build/test iterations.

### Approach C: Full External Lexer (like YAML)

Move ALL tokenization into the scanner, making grammar.js minimal.

**Pros:**
- Full control over tokenization
- Can handle unusual kvlang edge cases surgically

**Cons:**
- Destroys error recovery (confirmed by YAML maintainer)
- Much more complex — reimplements what tree-sitter already does
- Harder to maintain and extend
- Almost certainly unnecessary for kvlang

**Effort: Very High** — 1000+ lines of C, complex state machine.

### Approach D: Grammar.js with Widget/Property Pattern Matching (Updated Assessment)

One subtle variant: what if we treat each kvlang line as an independent item?

```javascript
rule_body: $ => seq(
  $._indent,
  repeat(choice(
    $.property_line,       // key: value
    $.event_binding,       // on_event: statement
    $.widget_header,       // WidgetName:
    $.canvas_header,       // canvas:
    $.id_line,             // id: name
    $.comment_line,        // # ...
  )),
  $._dedent,
)
```

This IS Approach B — scanner handles INDENT/DEDENT, grammar handles the line types. What changes is the granularity of the scanner. This is the recommended path.

**Effort: Medium** — same as B.

---

## Recommendation

**Approach B: Minimal External Scanner + Grammar Rules.**

Here is the step-by-step plan:

### Phase 1: Scaffold (blocking prerequisite)

The project must run `tree-sitter init` to get the proper structure. Since the project already has a `package.json` (from `bun init`), `tree-sitter init` will merge rather than overwrite.

```bash
# This creates tree-sitter.json, grammar.js, src/, bindings/, test/corpus/, etc.
# It prompts for: language name, description, author, license
tree-sitter init
```

### Phase 2: Minimal Scanner + Grammar Core

1. Create `src/scanner.c` with:
   - INDENT/DEDENT/NEWLINE tokens
   - Indent stack (int array)
   - Simple column counting (treat tabs as 8 spaces or disallow them)
   - Comment-aware line skipping
   - Five required lifecycle functions

2. Write initial `grammar.js` with:
   - `source_file` → repeat of directives + rules
   - Basic rule type parsing (root, class, dynamic class)
   - `_rule_body` → INDENT + statements + DEDENT
   - Property parsing (`identifier: value`)
   - ID declaration parsing

3. Write first corpus tests — start with trivial cases and build up

### Phase 3: Feature Completeness

Add in order:
1. Child widget nesting (uses existing rule body structure)
2. Canvas blocks (canvas, canvas.before, canvas.after)
3. Event bindings (on_X:)
4. Directives (#:kivy, #:import, #:set)
5. Dynamic classes (@ syntax)
6. Templates ([] syntax)
7. Multi-class rules (comma-separated)

### Phase 4: Edge Cases & Polish

- Comments in various positions
- Windows line endings (\r\n)
- Empty files and files with only directives
- Inconsistent indentation (error recovery)
- Property values with complex Python expressions

### Scanner.c Architecture (Projected)

```c
enum TokenType {
  NEWLINE,
  INDENT,
  DEDENT,
};

typedef struct {
  uint16_t indent_count;
  int8_t indent_stack[32];  // max nesting depth
} Scanner;
```

Key simplification vs Python: the scanner does NOT need to check for brackets because property values are single-line. When scanning after a newline, the logic is:

```
1. Skip blank lines
2. Count leading spaces
3. Compare with stack top:
   a. Greater → INDENT, push
   b. Lesser → DEDENT, pop (possibly multiple)
   c. Equal → NEWLINE
4. EOF → emit DEDENTs until stack empty
```

---

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Tabs vs. spaces** in kv files | Medium | Document that scanner normalizes tabs to 8 spaces (match Python). Add test cases. |
| **Python expression parsing** in property values | Low-Medium | Start with raw text capture (everything after `:` until newline). Can add Python parsing later via external tool or sub-parser. |
| **Error recovery during indentation errors** | Medium | Using Approach B (minimal scanner) gives good error recovery by default. Avoid Approach C. |
| **Incremental parsing correctness** | Low | Proper serialize/deserialize in scanner. Follow Python's pattern exactly. |
| **No existing tree-sitter kvlang** to reference | Low | Reference grammars: Python (indentation), YAML (structure), Nix (patterns). The Kivy community would welcome this. |
| **`#:` directive ambiguity with comments** | Low | `#:` followed by keyword (kivy/import/set) is a directive. Plain `#` is a comment. Scanner handles this at the token level. |
| **Multi-line Python expressions** in practice | Low-Medium | Kivy docs say properties are single-line, but users may use `(` for implicit joining. The scanner may need limited bracket awareness as an enhancement. |

---

## Ready for Proposal

**Yes.** The exploration is complete. The recommended approach is clear (Approach B), and the path forward is well-defined.

### What the orchestrator should tell the user:

1. **Blocking prerequisite:** Run `tree-sitter init` to scaffold the project properly. The current `bun init` structure is missing `tree-sitter.json`, `src/`, and `test/corpus/`.

2. **Core decision:** kvlang needs an external scanner (C file) for INDENT/DEDENT/NEWLINE tokens. This is unavoidable — all indentation-sensitive tree-sitter grammars require it.

3. **Scope realism:** A complete kvlang grammar is achievable but should be built incrementally — start with the simplest possible rule parsing, add features one at a time, and test after each addition.

4. **Learning curve:** The user will need to learn:
   - Tree-sitter grammar DSL functions
   - Basic C for the scanner (but simpler than Python's scanner)
   - Corpus test format
   - The `tree-sitter generate → build → test → parse` feedback loop

5. **Property values:** The grammar should capture property values as raw text initially (Python expression parsing can be added later as an enhancement).

---

## Appendix A: Complete kvlang Syntax Reference (Cheat Sheet)

```kv
# ============================================
# FILE-LEVEL DIRECTIVES
# ============================================
#:kivy 2.3.1
#:import name_imported python.dotted.path
#:import alias_name module.submodule.Name
#:set variable_name value_expression

# ============================================
# RULES (top-level)
# ============================================

# Root rule (0 indent, no brackets)
BoxLayout:
    orientation: 'vertical'

# Class rule (<ClassName>:)
<CustomWidget>:
    size_hint: (0.5, 1)
    canvas:
        Color:
            rgba: (0, 1, 0, 1)
        Rectangle:
            size: self.size
            pos: self.pos

# Multi-class rule (<ClassA,ClassB>:)
<ButtonA,ButtonB>:
    font_size: '18sp'
    size_hint: (0.3, 0.1)

# Dynamic class (<NewName@BaseClass>:)
<IconButton@Button>:
    size_hint: (None, None)
    size: (48, 48)

# ============================================
# RULE BODY (indented children)
# ============================================

Property declarations:
    prop_name: python_expression

Event bindings:
    on_event_name: python_statement
    on_press: root.button_pressed()
    on_release: print("released", args)
    on_text: app.search(args[1])
    on_touch_down: root.on_touch_down(args)

ID declaration:
    id: widget_identifier      # NOT a string — no quotes!

Special keywords:
    root       — The base widget of the current rule
    self       — The current widget
    app        — The application instance
    args       — Event arguments (in on_ callbacks)
    <id_name>  — Any ID declared in the same rule scope

# ============================================
# CANVAS BLOCKS
# ============================================
canvas:                    # Default canvas
canvas.before:             # Pre-draw canvas
canvas.after:              # Post-draw canvas

# Canvas instructions (inside canvas blocks):
    Color:
        rgba: (r, g, b, a)
    Rectangle:
        pos: (x, y)
        size: (w, h)
    Line:
        points: [x1, y1, x2, y2, ...]
        width: 2
    Ellipse:
        pos: (x, y)
        size: (w, h)
    Triangle:
        points: [x1, y1, x2, y2, x3, y3]
    Mesh:
        vertices: [x1, y1, u1, v1, ...]
        indices: [0, 1, 2, ...]
        mode: 'triangles'

# ============================================
# PROPERTY VALUE FORMATS
# ============================================
# Strings
text: 'single quotes'
title: "double quotes"

# Numbers
count: 42
ratio: 3.14159
negative: -5

# Colors
rgba: (1, 0, 0, 1)           # RGBA tuple
rgb: (0, 1, 0)                # RGB tuple (alpha defaults to 1)
hsv: (0.5, 1, 1)              # HSV tuple

# Coordinates / sizes
pos: (100, 200)
size: (300, 400)
center: self.center

# Booleans
enabled: True
disabled: False

# None
value: None

# Lists
items: [1, 2, 3, 4]
points: [0, 0, 100, 0, 100, 100]

# Dicts
props: {'key': 'value', 'count': 42}

# Property references (auto-binding)
text: root.title
pos: self.parent.center
size: self.texture_size

# Expressions
text: 'Count: ' + str(root.count)
pos: self.x, self.y + self.height
text: 'Active' if root.active else 'Inactive'

# ============================================
# COMPLETE REAL-WORLD EXAMPLE
# ============================================
#:kivy 2.0.0
#:import colors kivy.utils.get_color_from_hex

<MainScreen>:
    label_widget: status_label

    BoxLayout:
        orientation: 'vertical'
        spacing: 10
        padding: [20, 10]

        canvas.before:
            Color:
                rgba: colors('#333333')
            Rectangle:
                size: self.size
                pos: self.pos

        Label:
            id: status_label
            text: 'Ready'
            font_size: '24sp'
            color: (1, 1, 1, 1)

        BoxLayout:
            size_hint_y: None
            height: 50

            Button:
                text: 'Start'
                on_press: root.start_process()
                background_color: (0, 0.5, 0, 1)

            Button:
                text: 'Stop'
                on_press: root.stop_process()
                background_color: (0.5, 0, 0, 1)
```
