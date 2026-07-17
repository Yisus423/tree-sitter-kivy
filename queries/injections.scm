; injections.scm — kvlang Python injection
;
; Injects Python syntax highlighting into property values.
; value spans the full expression text; include-children
; ensures the Python parser sees the entire expression, not just
; the first matched child node.

((value) @injection.content
 (#set! injection.language "python")
 (#set! injection.include-children))

; Event body — multiline Python statements inside event bindings
; include-children ensures each expression line is included
((event_body) @injection.content
 (#set! injection.language "python")
 (#set! injection.include-children))
