; locals.scm — kvlang scope and definition tracking
;
; Pure S-expressions, no predicates.

;----------------------------------------------------------------------
; Scopes
;----------------------------------------------------------------------

(source_file) @local.scope
(root_rule) @local.scope
(class_rule) @local.scope
(template_rule) @local.scope
(widget_declaration) @local.scope
(canvas_block) @local.scope
(event_body) @local.scope

;----------------------------------------------------------------------
; Definitions
;----------------------------------------------------------------------

(class_entry
  name: (identifier) @local.definition.type)
(template_entry
  name: (identifier) @local.definition.type)
(root_rule
  name: (identifier) @local.definition.type)

(import_directive
  alias: (identifier) @local.definition.import)

(set_directive
  name: (identifier) @local.definition.constant)

(id_declaration
  name: (identifier) @local.definition.variable)

(property
  name: (identifier) @local.definition.field)

;----------------------------------------------------------------------
; References
;----------------------------------------------------------------------

; Widget names reference widget classes
(widget_declaration
  name: (identifier) @local.reference)

; Class/template bases reference existing widgets
(class_entry
  base: (identifier) @local.reference)
(template_entry
  base: (identifier) @local.reference)

; Canvas instruction names reference canvas methods
(canvas_instruction
  name: (identifier) @local.reference)

; Built-in references
((identifier) @local.reference
  (#any-of? @local.reference "self" "root" "app"))
