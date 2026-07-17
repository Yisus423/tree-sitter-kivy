; highlights.scm — kvlang syntax highlighting
;
; Pure S-expressions with universal predicates for cross-editor portability.
; Order: most-specific parent-context captures first,
; then anonymous token sets, then catch-all last.

;----------------------------------------------------------------------
; Comments
;----------------------------------------------------------------------

(comment) @comment @spell

; TODO/FIXME/HACK/WARNING tags in comments
((comment) @comment.todo @nospell
  (#lua-match? @comment "^[^\\S\\n]*#.*\\b(TODO|WIP)\\b"))
((comment) @comment.warning @nospell
  (#lua-match? @comment "^[^\\S\\n]*#.*\\b(HACK|WARNING|WARN|FIX|FIXME|BUG|XXX)\\b"))

;----------------------------------------------------------------------
; Strings
;----------------------------------------------------------------------

(string) @string

;----------------------------------------------------------------------
; Directives
;----------------------------------------------------------------------

; Directive headers (#:) — handled by external scanner

; Directive keywords
["import" "include"] @keyword.import
["set" "kivy"] @keyword.directive
"id" @keyword

; Import directive — alias → @module, module → @string.special.path
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
; Rule definitions (class, template, root)
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

;----------------------------------------------------------------------
; Widget layer
;----------------------------------------------------------------------

; Widget declaration — name → @function (matches kivy.vim convention)
(widget_declaration
  name: (identifier) @function)

; Property — name → @property
(property
  name: (identifier) @property)

; Id declaration — name → @variable.special or @string
(id_declaration
  name: (identifier) @variable.special)
(id_declaration
  name: (string) @string)

;----------------------------------------------------------------------
; Canvas and events
;----------------------------------------------------------------------

; Canvas block headers
["canvas" "canvas.before" "canvas.after"] @keyword

; Canvas instruction — name → @keyword.function
(canvas_instruction
  name: (identifier) @keyword.function)

; Event binding — event name → @attribute
(event_binding
  event: (event_name) @attribute)

;----------------------------------------------------------------------
; Values and built-in references
;----------------------------------------------------------------------

; Kivy built-in references — self, root, app
(identifier) @variable.builtin
(#any-of? @variable.builtin "self" "root" "app")

;----------------------------------------------------------------------
; Punctuation
;----------------------------------------------------------------------

["[" "]" "<" ">"] @punctuation.bracket
[":" ","] @punctuation.delimiter
"@" @punctuation.special
["+" "-"] @operator

;----------------------------------------------------------------------
; Catch-all identifier — MUST be last
;----------------------------------------------------------------------

(identifier) @variable
