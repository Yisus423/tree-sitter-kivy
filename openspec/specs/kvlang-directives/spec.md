# kvlang-directives Specification

## Purpose

Defines parsing of Kivy `#:import`, `#:set`, and `#:kivy` directives that appear at the start of `.kv` files. Directives provide module imports, global variable assignments, and version declarations. This specification is a new capability alongside `kvlang-core-syntax` — both contribute to the `source_file` node.

## Requirements

### Requirement: File-Level Directive Positioning

Directives MUST only appear at the start of the file, before any rule headers. A directive MUST be at column 0 (no leading whitespace). A source_file MAY contain zero or more directives followed by zero or more rules. A file with ONLY directives (zero rules) MUST produce a valid source_file.

| GIVEN | Expectation |
|-------|-------------|
| One `#:import` directive at column 0 followed by a blank line then a class rule | One import_directive node followed by one class_rule node under source_file |
| Two `#:set` directives at column 0, no rules | Two set_directive nodes under source_file, no ERROR |
| Empty file | Zero directive nodes, zero rule nodes, source_file with no children |
| A rule header at column 0, then a `#:set` directive below it | The `#:set` line is NOT parsed as a directive — may produce ERROR |

### Requirement: `#:import` Directive

Format: `#:import alias module.path` or `#:import alias module.sub.Name`. The alias MUST be a bare identifier (`[a-zA-Z_]\w*`). The module path is a dotted Python path captured as raw text to end-of-line. MUST produce an `import_directive` node with fields `alias` (identifier node) and `module` (raw text).

| GIVEN | Expectation |
|-------|-------------|
| `#:import Button kivy.uix.button` | import_directive node: alias "Button", module "kivy.uix.button" |
| `#:import CustomWidget myapp.widgets.CustomWidget` | import_directive node: alias "CustomWidget", module "myapp.widgets.CustomWidget" |
| `#:import` missing alias and module | ERROR node — incomplete directive |

### Requirement: `#:set` Directive

Format: `#:set <name> <value>`. The name MUST be a bare identifier (`[a-zA-Z_]\w*`). The value is everything remaining on the line after the name, captured as raw text (no Python expression parsing). MUST produce a `set_directive` node with fields `name` (identifier node) and `value` (raw text).

| GIVEN | Expectation |
|-------|-------------|
| `#:set root_color 1 0 0 1` | set_directive node: name "root_color", value "1 0 0 1" |
| `#:set myvar "complex: expression: here"` | set_directive node: name "myvar", value `"complex: expression: here"` (colons preserved in value) |
| `#:set` with no name | ERROR node — missing name |

### Requirement: `#:kivy` Directive

Format: `#:kivy <version>`. The version is everything after the `#:kivy` keyword to end-of-line, captured as raw text. MUST produce a `kivy_directive` node with field `version` (raw text). This directive is deprecated in Kivy runtime but MUST still be parsed without error.

| GIVEN | Expectation |
|-------|-------------|
| `#:kivy 2.3.1` | kivy_directive node: version "2.3.1" |
| `#:kivy 2.1.0-dev` | kivy_directive node: version "2.1.0-dev" |

### Requirement: Malformed Directives

A `#:` sequence not followed by a known keyword (`import`, `set`, or `kivy`) MUST produce an ERROR node. A `#:import` missing its alias or module MUST produce an ERROR node. A `#:set` missing its name MUST produce an ERROR node.

| GIVEN | Expectation |
|-------|-------------|
| `#:unknown some args` at column 0 | ERROR node at top level |
| `#:import` with no alias or module | ERROR node |
| `#:set` with no name | ERROR node |
| `#:import : Button` (colon without import keyword) | ERROR node |

### Requirement: Comment Preservation

Plain `#` comments (without `:`) MUST continue to be consumed by the scanner and discarded — no COMMENT nodes in the CST, matching existing behavior for `kvlang-core-syntax`. A `#:` sequence appearing inside a rule body (not at file start) is NOT a directive and MUST NOT crash the parser.

| GIVEN | Expectation |
|-------|-------------|
| `# just a comment` followed by a class rule | source_file with one class_rule node, no directive nodes, no COMMENT nodes — matching existing core-syntax behavior |
| `#:` inside a rule body (e.g., property value containing `#:`) | No crash; `#:` does not trigger directive parsing mid-rule |

### Requirement: Backward Compatibility

All 24 existing corpus tests in `test/corpus/core-syntax.txt` MUST pass unchanged after implementing this spec. The grammar and scanner changes MUST NOT break any existing parsing behavior.

| GIVEN | Expectation |
|-------|-------------|
| Each of the 24 existing core-syntax test cases | Produces the exact S-expression expected by those tests (no changes to existing CST output) |
| Empty file test | source_file with zero children — unchanged |
| Comment-only file test | source_file with zero children — unchanged |

## Edge Cases

| GIVEN | Expectation |
|-------|-------------|
| `#:import A a.b` then `#:set x 1` then blank lines then `#:kivy 2.0` | Three directive nodes in sequence under source_file |
| `#:import A a.b` then blank line then `#:set x 1` | import_directive and set_directive nodes separated by blank line (blank consumed via BREAK), both under source_file |
| `#:import A a.b` then a rule header immediately below (no blank line) | import_directive followed by a rule node, no ERROR |
| `#:import some_alias some.module.with.many.parts.ClassName` | import_directive with multi-level dotted module path |
| `#:set myvar self.some_func(a, b)` | set_directive with value containing parentheses and commas |
| `#:kivy` with no version | kivy_directive node with empty version field |