; folds.scm — kvlang foldable regions
;
; Pure S-expressions, no predicates, for cross-editor portability.
; Each node marks the full range of a foldable block.

;----------------------------------------------------------------------
; Rules — root, class, and template rule bodies
;----------------------------------------------------------------------

(root_rule) @fold
(class_rule) @fold
(template_rule) @fold

;----------------------------------------------------------------------
; Widget declarations — nested children
;----------------------------------------------------------------------

(widget_declaration) @fold

;----------------------------------------------------------------------
; Canvas blocks — indented instruction blocks
;----------------------------------------------------------------------

(canvas_block) @fold

;----------------------------------------------------------------------
; Event bodies — multiline Python handlers
;----------------------------------------------------------------------

(event_body) @fold
