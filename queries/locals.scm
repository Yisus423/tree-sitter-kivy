; locals.scm — kvlang scope and definition tracking
;
; Pure S-expressions, no predicates.

;----------------------------------------------------------------------
; Phase 2.1: Scope definitions
;----------------------------------------------------------------------

; File-level and rule-level scopes
(source_file) @local.scope
(root_rule) @local.scope
(class_rule) @local.scope
(template_rule) @local.scope
(widget_declaration) @local.scope
(canvas_block) @local.scope

;----------------------------------------------------------------------
; Phase 2.2: Definition captures
;----------------------------------------------------------------------

; Type definitions — class/template/root rule names
(class_entry
  name: (identifier) @local.definition.type)
(template_entry
  name: (identifier) @local.definition.type)
(root_rule
  name: (identifier) @local.definition.type)

; Import alias → definition.import
(import_directive
  alias: (identifier) @local.definition.import)

; Set directive name → definition.constant
(set_directive
  name: (identifier) @local.definition.constant)

; Id declaration name → definition.variable
(id_declaration
  name: (identifier) @local.definition.variable)

;----------------------------------------------------------------------
; Phase 2.3: Reference captures
;----------------------------------------------------------------------

; Widget name → reference (references a widget class)
(widget_declaration
  name: (identifier) @local.reference)

; Class/template bases → reference (base classes are references)
(class_entry
  base: (identifier) @local.reference)
(template_entry
  base: (identifier) @local.reference)

; Canvas instruction name → reference
(canvas_instruction
  name: (identifier) @local.reference)

; Event handler → reference (function/method being referenced)
(event_binding
  handler: (property_value (identifier) @local.reference))
(event_binding
  handler: (property_value (dotted_ref) @local.reference))
