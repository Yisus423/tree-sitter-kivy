# template-rules Specification

## Purpose

Defines Kvlang template rule syntax: bracketed rule headers at level 0 with optional base class inheritance (`[Name]:`, `[Name@Base]:`, `[Name@Base1+Base2]:`) and full rule body support. Template rules mirror `class_rule` structure but use square bracket delimiters and produce a `template_rule` node.

## Requirements

### Requirement: Template Rule Header

A template rule header MUST be a non-empty identifier in square brackets at level 0, ending with a colon. The identifier MAY be followed by `@` and one or more base class identifiers separated by `+`. The header SHALL produce a `template_rule` node queryable via tree-sitter (e.g., `(template_rule) @t`).

| GIVEN | Expectation |
|-------|-------------|
| `[Template]:` at level 0 | `template_rule` node with name "Template" |
| `[Custom@Button]:` at level 0 | `template_rule` with name "Custom" and base "Button" |
| `[NewWidget@Behavior+Label]:` at level 0 | `template_rule` with name "NewWidget", bases "Behavior" + "Label" |
| `[]:` at level 0 | ERROR — name is mandatory |
| `[@Button]:` at level 0 | ERROR — name required before `@` |

### Requirement: Template Rule Body

A template rule header MAY be followed by an indented block containing properties, event bindings, ID declarations, canvas blocks, and child widget declarations — the same body syntax as `class_rule`. Empty template rules (no block) SHALL parse without error.

| GIVEN | Expectation |
|-------|-------------|
| `[T]:` + indented `  text: "Hello"` | `template_rule` with `block` child containing one property node |
| `[T]:` immediately followed by another rule at level 0 | `template_rule` with no `block` child, no ERROR |
| `[T]:` + indented `  Button:` | `template_rule`'s `block` contains a `widget_declaration` node |
| `[T]:` + indented `  canvas:` + canvas instructions | `template_rule`'s `block` contains a `canvas_block` node |
