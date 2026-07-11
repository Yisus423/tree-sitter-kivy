# Delta for kvlang-core-syntax

## MODIFIED Requirements

### Requirement: Source File Structure

Source file MUST contain zero or more rule headers at level 0, MAY include comments and blank lines between rules. Malformed content at level 0 SHOULD produce ERROR.
(Previously: "Only # comment lines" row expected "Zero rule nodes; comments consumed as tokens")

| GIVEN | Expectation |
|-------|-------------|
| `<A>:`, blank, `<B>:` at level 0 | Two class_rule children under source_file |
| Only `# comment` lines | source_file with zero rule nodes, one (comment) extra node |
| Random text at level 0 | ERROR node at top level |

### Requirement: Comments and Blank Lines

Comments (`#`) and blank lines MUST be parseable anywhere and SHALL NOT affect indent tracking. Plain `#` lines SHALL produce `(comment)` extra nodes in the CST.
(Previously: Comments consumed as tokens — no CST nodes; `#:` at col > 0 only guaranteed no crash)

| GIVEN | Expectation |
|-------|-------------|
| Only `# comment` lines at file top | source_file with zero rule nodes, one (comment) extra node |
| `# comment` then a property in body | Rule block still contains property; (comment) appears as extra node in enclosing rule |
| `#:` at col > 0 inside rule body (e.g., property value) | (comment) node produced, not a directive; no crash |
| Blank line between two properties | Both properties in same block |

# Delta for kvlang-directives

## MODIFIED Requirements

### Requirement: Comment Preservation

Plain `#` comments at col > 0 MUST produce `(comment)` extra nodes in the CST. `#:` at col > 0 inside a rule body SHALL produce a `(comment)` node, not a directive.
(Previously: Plain `#` comments consumed and discarded — no COMMENT nodes; `#:` at col > 0 only guaranteed no crash)

| GIVEN | Expectation |
|-------|-------------|
| `# just a comment` followed by a class rule | source_file with one (comment) extra node followed by one class_rule node |
| `#:` inside a rule body (e.g., property value containing `#:`) | (comment) node produced, not a directive; no crash |

### Requirement: Backward Compatibility

All 24 existing corpus tests in `test/corpus/core-syntax.txt` MUST pass unchanged after implementing this spec. The grammar and scanner changes MUST NOT break any existing parsing behavior.
(Previously: Comment-only file test expected zero children — now expects (comment) extra node)

| GIVEN | Expectation |
|-------|-------------|
| Each of the 24 existing core-syntax test cases | Produces the exact S-expression expected by those tests (no changes to existing CST output) |
| Empty file test | source_file with zero children — unchanged |
| Comment-only file test | source_file with one (comment) extra node |
