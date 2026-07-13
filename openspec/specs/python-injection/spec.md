# python-injection Specification

## Purpose

Define the language injection query that maps Kivy `property_value` nodes to Python syntax highlighting, enabling editor support for Python expressions inside .kv files without grammar changes.

## Requirements

### Requirement: Python Injection Query

The system MUST provide `queries/injections.scm` with a tree-sitter injection query targeting `property_value` nodes. The query SHALL use `injection.include-children` so the full `property_value` text range is re-parsed as Python.

| Component | Value |
|-----------|-------|
| Query file | `queries/injections.scm` |
| Target node | `property_value` |
| Injection language | `"python"` |
| `include-children` | `true` (full range re-parse) |

#### Scenario: property_value injected as Python

- GIVEN a kvlang `.kv` file with `color: (1, 0, 0, 1)`
- WHEN the injection query processes `property_value`
- THEN the node range becomes an injection point for Python parsing
- AND the tuple `(1, 0, 0, 1)` SHALL receive Python syntax highlighting

#### Scenario: Event binding handler also covered

- GIVEN `on_press: app.some_method()`
- WHEN the injection query processes the `property_value` node
- THEN the expression `app.some_method()` SHALL be re-parsed as Python
- AND `app` SHALL highlight as a Python variable, `some_method` as a method call

### Requirement: tree-sitter.json Registration

The system MUST add `"injections": ["queries/injections.scm"]` to the kivy grammar entry in `tree-sitter.json`.

#### Scenario: injections key added

- GIVEN `tree-sitter.json` with `grammars` containing the kivy entry
- WHEN the config is updated for injection support
- THEN the kivy grammar SHALL include `"injections": ["queries/injections.scm"]`
- AND existing `highlights`, `locals`, `tags` keys SHALL remain present

### Requirement: No kvlang Highlight Regression

Existing kvlang-specific highlights, locals, and tags SHALL remain fully functional alongside Python injection. The injection layer SHALL NOT override or conflict with kvlang captures.

#### Scenario: kvlang highlights still apply alongside Python injection

- GIVEN a `.kv` file with `font_size: 24`
- WHEN both `highlights.scm` AND `injections.scm` process the file
- THEN `font_size` SHALL still capture as `@property` via kvlang
- AND `24` SHALL capture as `@number` via kvlang highlights
- AND the Python injection SHALL operate on a separate, orthogonal parse tree layer
- AND no highlight conflict SHALL occur between the two layers

### Requirement: Graceful Degradation

If the Python tree-sitter parser is not available in the user's editor, the injection query MUST be silently skipped. The editor SHALL NOT crash, error, or lose kvlang functionality.

#### Scenario: Missing Python parser

- GIVEN an editor without the Python tree-sitter parser installed
- WHEN a `.kv` file is opened
- THEN the editor SHALL silently skip the `python` injection
- AND kvlang highlights, locals, and tags SHALL still work normally
- AND no error dialog or diagnostic SHALL appear
