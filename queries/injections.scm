; injections.scm — kvlang Python injection
;
; Injects Python syntax highlighting into property values.
; property_value spans the full expression text; include-children
; ensures the Python parser sees the entire expression, not just
; the first matched child node.

((property_value) @injection.content
 (#set! injection.language "python")
 (#set! injection.include-children))

; Event body — multiline Python statements inside event bindings
; include-children ensures each event_statement line is included
((event_body) @injection.content
 (#set! injection.language "python")
 (#set! injection.include-children))
