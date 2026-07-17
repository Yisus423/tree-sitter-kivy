; injections.scm — kvlang Python injection
;
; Kivy property values and event handlers are Python expressions.
; We inject Python into event-driven properties (on_*) and known
; expression properties, with a generic fallback for all values.

; Event bindings — on_* handlers contain Python expressions
; (matches Kivy's parser: if name[:3] == 'on_')
(property
  name: (identifier) @_prop
  (#lua-match? @_prop "^on_")
  value: (value) @injection.content
  (#set! injection.language "python")
  (#set! injection.include-children))

; Event body — multiline Python statements inside event bindings
((event_body) @injection.content
  (#set! injection.language "python")
  (#set! injection.include-children))

; Fallback: generic value → Python
; All Kivy property values are Python expressions
((value) @injection.content
  (#set! injection.language "python")
  (#set! injection.include-children))
