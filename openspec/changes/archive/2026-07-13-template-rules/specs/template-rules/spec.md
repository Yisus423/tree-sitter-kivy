# Delta for template-rules (Full Spec — New Capability)

This is a full spec for the new `template-rules` domain. There is no existing spec to delta against.

---

# template-rules Specification

## Purpose

Defines Kvlang template rule syntax: bracketed rule headers at level 0 with optional base class inheritance (`[Name]:`, `[Name@Base]:`, `[Name@Base1+Base2]:`) and full rule body support. Template rules mirror `class_rule` structure but use square bracket delimiters and produce a `template_rule` node.

## Requirements

### Requirement: Template Rule Header

A template rule header MUST be a non-empty identifier in square brackets at level 0, ending with a colon. The identifier MAY be followed by `@` and one or more base class identifiers separated by `+`. The header SHALL produce a `template_rule` node queryable via tree-sitter (e.g., `(template_rule) @t`).

#### Scenario: Bare template without base

- GIVEN `[Template]:` at level 0
- WHEN parsed
- THEN a `template_rule` node is produced with name "Template"

#### Scenario: Template with single base

- GIVEN `[Custom@Button]:` at level 0
- WHEN parsed
- THEN a `template_rule` node is produced with name "Custom" and base "Button"

#### Scenario: Template with multiple bases

- GIVEN `[NewWidget@Behavior+Label]:` at level 0
- WHEN parsed
- THEN a `template_rule` node is produced with name "NewWidget" and bases "Behavior", "Label"

#### Scenario: Empty brackets produce ERROR

- GIVEN `[]:` at level 0
- WHEN parsed
- THEN an ERROR node is produced

#### Scenario: Missing name with only base

- GIVEN `[@Button]:` at level 0
- WHEN parsed
- THEN an ERROR node is produced

### Requirement: Template Rule Body

A template rule header MAY be followed by an indented block containing properties, event bindings, ID declarations, canvas blocks, and child widget declarations — the same body syntax as `class_rule`. Empty template rules (no block) SHALL parse without error.

#### Scenario: Template with property body

- GIVEN `[T]:` at level 0 with `  text: "Hello"` indented below
- WHEN parsed
- THEN `template_rule` has a `block` child containing one property node

#### Scenario: Template without body

- GIVEN `[T]:` immediately followed by another rule at level 0 with no body
- WHEN parsed
- THEN `template_rule` has no `block` child, no ERROR

#### Scenario: Template with child widgets

- GIVEN `[T]:` at level 0 with `  Button:` indented below
- WHEN parsed
- THEN `template_rule`'s `block` child contains a `widget_declaration` node
