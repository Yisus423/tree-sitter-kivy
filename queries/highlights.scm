; highlights.scm — kvlang syntax highlighting
;
; Order: most-specific parent-context captures first,
; then anonymous token sets, then catch-all last.
;
; Per design: Pure S-expressions, no predicates, for cross-editor portability.

;----------------------------------------------------------------------
; Phase 1.1: Core structure — comments, strings, numbers, booleans, None
;----------------------------------------------------------------------

(comment) @comment @spell
(string) @string
(number) @number
(boolean) @boolean
["None"] @constant.builtin

;----------------------------------------------------------------------
; Phase 1.2: Directives — import, set, kivy, include
;----------------------------------------------------------------------

; Directive keywords
["import" "include"] @keyword.import
["set" "kivy"] @keyword
"id" @keyword

; Import directive — alias → @module, module path → @string.special.path
(import_directive
  alias: (identifier) @module)
(import_directive
  module: (directive_value) @string.special.path)

; Set directive — name → @constant
(set_directive
  name: (identifier) @constant)

; Kivy directive — version → @string.special
(kivy_directive
  version: (directive_value) @string.special)

; Include directive — path → @string.special.path
(include_directive
  path: (directive_value) @string.special.path)

;----------------------------------------------------------------------
; Phase 1.3: Rules and widget layer
;----------------------------------------------------------------------

; Root rule — name → @type
(root_rule
  name: (identifier) @type)

; Class rule — entry name → @type.definition, base → @type, negated → @type
(class_entry
  name: (identifier) @type.definition)
(class_entry
  base: (identifier) @type)
(class_rule
  negated: (identifier) @type)

; Template rule — entry name → @type.definition, base → @type
(template_entry
  name: (identifier) @type.definition)
(template_entry
  base: (identifier) @type)

; Widget declaration — name → @type
(widget_declaration
  name: (identifier) @type)

; Property — name → @property
(property
  name: (identifier) @property)

;----------------------------------------------------------------------
; Phase 1.4: Canvas and events
;----------------------------------------------------------------------

; Canvas block headers
["canvas" "canvas.before" "canvas.after"] @keyword

; Canvas instruction — name → @type
(canvas_instruction
  name: (identifier) @type)

; Event binding — event name → @attribute
(event_binding
  event: (event_name) @attribute)

; Event binding — handler: identifier → @function, dotted_ref → @function.method
(event_binding
  handler: (property_value (identifier) @function))
(event_binding
  handler: (property_value (dotted_ref) @function.method))

;----------------------------------------------------------------------
; Phase 1.5: Values and identifiers
;----------------------------------------------------------------------

; Id declaration — name → @variable (identifier) or @string (string)
(id_declaration
  name: (identifier) @variable)
(id_declaration
  name: (string) @string)

; Property values — dotted_ref → @variable.member, identifier → @variable
(property
  value: (property_value (dotted_ref) @variable.member))
(property
  value: (property_value (identifier) @variable))

; Punctuation
["(" ")" "[" "]" "{" "}" "<" ">"] @punctuation.bracket
[":" ","] @punctuation.delimiter

; Operators
["@" "+" "-"] @operator

; Dotted references (general — after parent-context to avoid overlap)
(dotted_ref) @variable.member

; Catch-all identifier — MUST be last so specific parent-context captures win
(identifier) @variable
