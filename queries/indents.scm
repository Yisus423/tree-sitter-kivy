; indents.scm — kvlang indentation rules
;
; Pure S-expressions, no predicates, for cross-editor portability.
; Nodes that introduce indented blocks drive @indent;
; dedent is implicit — editors detect it from indentation level changes.

;----------------------------------------------------------------------
; Block introducers — indent after colon + newline
;----------------------------------------------------------------------

(root_rule) @indent
(class_rule) @indent
(template_rule) @indent
(widget_declaration) @indent
(canvas_block) @indent
(event_body) @indent
