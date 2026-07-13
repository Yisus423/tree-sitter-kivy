# Delta for kvlang-directives

## ADDED Requirements

### Requirement: `#:include` Directive

Format: `#:include <path>` or `#:include force <path>`. The `force` token is NOT a structured field — the full text after the `include` keyword is captured as raw `directive_value` to end-of-line. MUST produce an `include_directive` node with field `path` (directive_value raw text). Follows the same positioning rules as all other directives (column 0, before rule headers).

| GIVEN | Expectation |
|-------|-------------|
| `#:include myfile.kv` | include_directive node: path "myfile.kv" |
| `#:include force myfile.kv` | include_directive node: path "force myfile.kv" (force is part of raw value, not a field) |
| `#:include subdir/nested/file.kv` | include_directive node: path "subdir/nested/file.kv" |
| `#:import A a` then `#:include f.kv` then `#:set x 1` | import_directive, include_directive, set_directive — all parsed correctly under source_file |
| `#:include` missing path | ERROR node — incomplete directive |

## MODIFIED Requirements

### Requirement: Malformed Directives

A `#:` sequence not followed by a known keyword (`import`, `set`, `kivy`, or `include`) MUST produce an ERROR node. A `#:import` missing its alias or module MUST produce an ERROR node. A `#:set` missing its name MUST produce an ERROR node. An `#:include` without a path MUST produce an ERROR node.
(Previously: known keywords were `import`, `set`, `kivy`; `#:include` not covered)

| GIVEN | Expectation |
|-------|-------------|
| `#:unknown some args` at column 0 | ERROR node at top level |
| `#:import` with no alias or module | ERROR node |
| `#:set` with no name | ERROR node |
| `#:import : Button` (colon without import keyword) | ERROR node |
| `#:include` with no path | ERROR node |
