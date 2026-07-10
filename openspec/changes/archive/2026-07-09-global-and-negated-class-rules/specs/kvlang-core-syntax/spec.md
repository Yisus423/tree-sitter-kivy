# Delta for kvlang-core-syntax

## MODIFIED Requirements

### Requirement: Rule Headers

Root rules MUST be a bare identifier at level 0 ending with colon (`WidgetName:`). Class rules MUST be one of the following forms in angle brackets at level 0 ending with colon: `<WidgetName>:` (standard class), `<>:` (global — applies to all classes), or `<-Name>:` (negated — applies to all classes except Name). Class rules MAY include an optional `@` followed by one or more base class identifiers (separated by `+`) for dynamic class inheritance: `<Name@Base>:`, `<Name@Base1+Base2>:`. The global form `<>:` SHALL NOT have a name, base, or negation. The negated form `<-Name>:` SHALL support exactly one identifier and SHALL NOT combine with `@`. Both `<>:` and `<-Name>:` MAY have a rule body via indented children.
(Previously: class rules only supported a single identifier in angle brackets, with optional `@` base syntax. Added `<>:` global and `<-Name>:` negated forms.)

| GIVEN | Expectation |
|-------|-------------|
| `BoxLayout:` at level 0 | root_rule node with name "BoxLayout" |
| `<MyButton>:` at level 0 | class_rule node with name "MyButton" |
| `BoxLayout` at level 0 | ERROR — missing colon |
| `<CustomButton@Button>:` at level 0 | class_rule node with name "CustomButton" and base "Button" |
| `<NewWidget@Behavior+Label>:` at level 0 | class_rule node with name "NewWidget" and base fields "Behavior", "Label" |
| `<@Button>:` at level 0 | ERROR — missing name before `@` |
| `<>:` at level 0 | class_rule node, no name or negated field (global rule) |
| `<-Button>:` at level 0 | class_rule node with negated field "Button" |
| `<-Name@Base>:` at level 0 | ERROR — negation cannot combine with `@` |
