; highlights.scm — kvlang syntax highlighting
;
; Order: most-specific parent-context captures first,
; then anonymous token sets, then catch-all last.
;
; Per design: Pure S-expressions, no predicates, for cross-editor portability.

;----------------------------------------------------------------------
; Phase 1.1: Core structure — comments, strings
;----------------------------------------------------------------------

(comment) @comment @spell
(string) @string

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

; Root rule — name → @function (matches kivy.vim convention)
(root_rule
  name: (identifier) @function)

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

; Widget declaration — name → @function (matches kivy.vim convention)
(widget_declaration
  name: (identifier) @function)

; Property — name → @property
(property
  name: (identifier) @property)

;----------------------------------------------------------------------
; Phase 1.4: Canvas and events
;----------------------------------------------------------------------

; Canvas block headers
["canvas" "canvas.before" "canvas.after"] @keyword

; Canvas instruction — name → @keyword.function (matches kivy.vim's Statement)
(canvas_instruction
  name: (identifier) @keyword.function)

; Event binding — event name → @attribute
(event_binding
  event: (event_name) @attribute)

; Event statement — Python code line inside multiline event body
; (content highlighted via Python injection in injections.scm)
(event_statement) @embedded

; Event binding — handler catches property_value (now raw text, handled by Python injection)

;----------------------------------------------------------------------
; Phase 1.5: Values and identifiers
;----------------------------------------------------------------------

; Kivy built-in references — self, root, app
; Uses built-in #any-of? predicate (NOT Lua-specific — works in all tree-sitter impls)
(identifier) @variable.builtin
(#any-of? @variable.builtin "self" "root" "app")

; Id declaration — name → @variable.special or @string
(id_declaration
  name: (identifier) @variable.special)
(id_declaration
  name: (string) @string)

; Property values — now raw text, handled by Python injection

; Punctuation — brackets that still exist in grammar
; ( ) { } were removed with tuple/dict_value/rules
; [ ] < > remain as anonymous tokens in template/class rules
["[" "]" "<" ">"] @punctuation.bracket
[":" ","] @punctuation.delimiter

; Operators
["@" "+" "-"] @operator

; Catch-all identifier — MUST be last so specific parent-context captures win
(identifier) @variable
