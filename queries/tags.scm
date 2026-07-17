; tags.scm — kvlang document symbol navigation
;
; Follows the tree-sitter tags convention:
;   @name captures the identifier text,
;   @definition.* captures the parent node range.

;----------------------------------------------------------------------
; Class, template, and rule definitions
;----------------------------------------------------------------------

(class_entry
  name: (identifier) @name) @definition.class
(template_entry
  name: (identifier) @name) @definition.class
(root_rule
  name: (identifier) @name) @definition.class

;----------------------------------------------------------------------
; Widget and property definitions
;----------------------------------------------------------------------

(widget_declaration
  name: (identifier) @name) @definition.function

(property
  name: (identifier) @name) @definition.field

;----------------------------------------------------------------------
; Import, constant, and variable definitions
;----------------------------------------------------------------------

(import_directive
  alias: (identifier) @name) @definition.import

(set_directive
  name: (identifier) @name) @definition.constant

(id_declaration
  name: (identifier) @name) @definition.variable
