; tags.scm — kvlang document symbol navigation
;
; Follows the tree-sitter tags convention:
;   @name captures the identifier text,
;   @definition.* captures the parent node range.
;
; Pure S-expressions, no predicates.

;----------------------------------------------------------------------
; Phase 3.1: Class and rule definitions
;----------------------------------------------------------------------

(class_entry
  name: (identifier) @name) @definition.class
(template_entry
  name: (identifier) @name) @definition.class
(root_rule
  name: (identifier) @name) @definition.class

;----------------------------------------------------------------------
; Phase 3.2: Import, constant, and variable definitions
;----------------------------------------------------------------------

(import_directive
  alias: (identifier) @name) @definition.import
(set_directive
  name: (identifier) @name) @definition.constant
(id_declaration
  name: (identifier) @name) @definition.variable
