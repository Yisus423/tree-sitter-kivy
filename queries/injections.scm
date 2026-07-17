; injections.scm — kvlang Python injection
;
; All Kivy property values and event handlers are Python expressions.
; Single-line values and multiline event bodies both inject Python.

((value) @injection.content
  (#set! injection.language "python")
  (#set! injection.include-children))

((event_body) @injection.content
  (#set! injection.language "python")
  (#set! injection.include-children))
