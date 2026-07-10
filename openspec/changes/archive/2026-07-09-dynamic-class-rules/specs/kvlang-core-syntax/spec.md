# Delta for kvlang-core-syntax

## MODIFIED Requirements

### Requirement: Rule Headers

Root rules MUST be a bare identifier at level 0 ending with colon (`WidgetName:`). Class rules MUST be an identifier in angle brackets at level 0 ending with colon (`<WidgetName>:`). Class rules MAY include an optional `@` followed by one or more base class identifiers (separated by `+`) for dynamic class inheritance: `<Name@Base>:`, `<Name@Base1+Base2>:`.
(Previously: class rules only supported a single identifier in angle brackets, no `@` base syntax.)

| GIVEN | Expectation |
|-------|-------------|
| `BoxLayout:` at level 0 | root_rule node with name "BoxLayout" |
| `<MyButton>:` at level 0 | class_rule node with name "MyButton" |
| `BoxLayout` at level 0 | ERROR — missing colon |
| `<CustomButton@Button>:` at level 0 | class_rule node with name "CustomButton" and base "Button" |
| `<NewWidget@Behavior+Label>:` at level 0 | class_rule node with name "NewWidget" and base fields "Behavior", "Label" |
| `<@Button>:` at level 0 | ERROR — missing name before `@` |
