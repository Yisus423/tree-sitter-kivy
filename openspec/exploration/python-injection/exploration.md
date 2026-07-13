## Exploration: Python Injection in Property Values

### Current State
Property values in Kivy's kvlang are Python expressions. The current grammar parses them with a `property_value` rule that matches specific literal types (string, number, boolean, None, tuple, list_value, dict_value, dotted_ref, identifier) followed by an optional hidden `_raw_value` token that catches the remaining text on the line.

**What works:**
- Literal values (strings, numbers, booleans, None, tuples, lists, dicts) parse as structured named nodes
- Simple dotted references (e.g. `self.pos`, `root.title`) parse cleanly

**What doesn't work:**
- Complex expressions like `root.do_something(arg)` → parses as `dotted_ref` (`root.do_something`) + hidden `_raw_value` (`(arg)`) — no syntactic recognition of the full expression
- Arithmetic like `self.parent.width * 0.5` → parses as `dotted_ref` + hidden `_raw_value`
- Function calls like `print("clicked")` → parses as `identifier` + hidden `_raw_value`
- There is NO `queries/injections.scm` file, so no Python injection happens
- The `dotted_ref` is an opaque single token — `self.pos` has no internal structure

### Key insight from tree-sitter parse output
The `property_value` node range ALWAYS spans the FULL expression text including hidden children:
- `root.do_something(arg)`: property_value [1,14]-[1,36], dotted_ref [1,14]-[1,31]
- `self.parent.width * 0.5`: property_value [2,10]-[2,33], dotted_ref [2,10]-[2,27]
- `print("clicked")`: property_value [3,12]-[3,28], identifier [3,12]-[3,17]

This means `injection.include-children` on property_value gives the Python parser the complete expression text.

### Affected Areas
- `grammar.js` — optional: could add a `python_expression` named rule, but NOT required
- `queries/injections.scm` — NEW file: injection query mapping property_value → Python
- `tree-sitter.json` — add `"injections"` key pointing to the new query file (optional: defaults to queries/injections.scm)
- `queries/highlights.scm` — property value highlights may need updating to avoid conflicts with Python highlights (but Python injection is a separate layer, so kvlang highlights on `property` name etc. remain unaffected)
- `queries/locals.scm` — unaffected (Python injection handles its own scoping)

### How Tree-Sitter Language Injection Works
The injection system is well-established in tree-sitter. Key mechanism:
1. An `injections.scm` query matches specific nodes in the host grammar
2. The matched node's text range is re-parsed with the target language's parser
3. Both parse trees coexist — the host tree for high-level structure, the injected tree for fine-grained highlighting
4. Editors (Neovim, Helix, etc.) use the injected tree for highlighting within the injected region

**Standard patterns from reference grammars:**
- `tree-sitter-html`: `((script_element (raw_text) @injection.content) (#set! injection.language "javascript"))`
- `tree-sitter-javascript`: `((comment) @injection.content (#set! injection.language "jsdoc"))`
- `tree-sitter-html` for CSS: `((style_element (raw_text) @injection.content) (#set! injection.language "css"))`

**Key properties:**
- `#set! injection.language "python"` — statically set the language
- `#set! injection.include-children` — include child node text in the injection (needed here because property_value has named children)
- `@injection.content` — captures the node whose text will be re-parsed

### Edge Cases Analysis

| Value | property_value text | Valid Python? | Notes |
|-------|-------------------|---------------|-------|
| `"Hello"` | `"Hello"` | Yes — string literal | No _raw_value |
| `42` | `42` | Yes — integer literal | No _raw_value |
| `True` | `True` | Yes — boolean literal | No _raw_value |
| `None` | `None` | Yes — None literal | No _raw_value |
| `(0, 0)` | `(0, 0)` | Yes — tuple literal | No _raw_value |
| `[1, 2, 3]` | `[1, 2, 3]` | Yes — list literal | No _raw_value |
| `{'x': 1}` | `{'x': 1}` | Yes — dict literal | No _raw_value |
| `self.pos` | `self.pos` | Yes — attribute access | No _raw_value |
| `root.do_something(arg)` | `root.do_something(arg)` | Yes — method call | _raw_value catches `(arg)` |
| `self.parent.width * 0.5` | `self.parent.width * 0.5` | Yes — arithmetic | _raw_value catches ` * 0.5` |
| `print("clicked")` | `print("clicked")` | Yes — function call | _raw_value catches `("clicked")` |
| `'Count: ' + str(root.count)` | `'Count: ' + str(root.count)` | Yes — string concat | _raw_value catches remainder |
| `'Active' if root.active else 'Inactive'` | Full expression text | Yes — ternary | _raw_value catches remainder |
| `lambda: root.do_something()` | `lambda: root.do_something()` | Yes — lambda | _raw_value catches remainder |

**Conclusion: ALL Kivy property values are valid Python expressions.** This is by design — Kivy evaluates them as Python at runtime.

### Approaches

1. **Pure injection (injections.scm only)** — Zero grammar changes
   - Create `queries/injections.scm` with:
     ```scm
     ((property_value) @injection.content
      (#set! injection.language "python")
      (#set! injection.include-children))
     ```
   - Optionally reference it in `tree-sitter.json` (default path is `queries/injections.scm`)
   - No grammar changes, no test changes
   - Pros: Minimal diff, zero risk, immediate benefit. All property values get Python highlighting. Works for both `property` and `event_binding` (both use `property_value` for the value).
   - Cons: Every property value gets re-parsed as Python (minor perf cost). If someone wants to NOT inject Python into specific property values (e.g., simple literals), they can't opt out at the kivy-grammar level.
   - Effort: Low (create 3-line file)

2. **Grammar + injection** — Add `python_expression` named rule + injection
   - Add to grammar.js:
     ```javascript
     property_value: $ => choice(
       $.string, $.number, $.boolean, $._none,
       $.tuple, $.list_value, $.dict_value,
       $.dotted_ref, $.identifier,
       $.python_expression,
     ),
     python_expression: $ => token(/[^\n\r]+/),
     ```
   - Remove `_raw_value` (no longer needed), make it named
   - Then inject on `(python_expression)` in `injections.scm`
   - Pros: More explicit about which nodes contain Python. `python_expression` as a named node appears in the CST, making it self-documenting.
   - Cons: BUT — `python_expression` would only catch things that don't match any literals first (because it's last in the choice). For `root.do_something(arg)`, `dotted_ref` matches first and `_raw_value` still catches the suffix. Would still need `include-children` on `property_value` for full-text injection. OR would need to reorder the grammar (put `python_expression` first) which breaks structured literals.
   - Effort: Medium (grammar change + test updates + injection file)

3. **Full restructure** — Make property_value a single catch-all
   - Replace `property_value` with: `property_value: $ => token(/[^\n\r]+/)`
   - Remove all literal rules from property_value
   - Pros: Simplest possible parse tree. Injection handles everything.
   - Cons: Breaks kvlang highlighting for literals within property values (strings, numbers, booleans lose their kvlang-level highlighting). Requires updating `highlights.scm`, `locals.scm`, and all tests. Removes useful structural information from the CST.
   - Effort: High

### Recommendation

**Approach 1: Pure injection (injections.scm only)** — Create `queries/injections.scm` with a single pattern that maps `property_value` (with `include-children`) to Python injection.

**Rationale:**
1. Zero grammar changes = zero risk of breaking existing tests
2. ALL Kivy property values are Python expressions by definition — injecting Python is semantically correct for all of them
3. The `property_value` node range already spans the full expression text (verified by parsing real examples)
4. `injection.include-children` is the standard mechanism for this (same approach used by Svelte, Vue, etc.)
5. Event bindings use the same `property_value` rule, so they get Python highlighting automatically
6. The existing kvlang highlighting for property NAMES (`@property`), event names (`@attribute`), etc. remains intact — Python injection is an orthogonal layer
7. Editors handle injection layering efficiently (only re-parses visible/changed ranges)

**What the injection query looks like:**
```scm
; queries/injections.scm
; Inject Python into Kivy property values (all Kivy property values are Python expressions)

((property_value) @injection.content
 (#set! injection.language "python")
 (#set! injection.include-children))
```

**Update to `tree-sitter.json`:**
Add after `"locals"` or `"tags"`:
```json
"injections": ["queries/injections.scm"]
```

### Relationship with existing highlights
The existing `highlights.scm` has specific patterns for property values:
```scm
; Property values — dotted_ref → @variable.member, identifier → @variable
(property
  value: (property_value (dotted_ref) @variable.member))
(property
  value: (property_value (identifier) @variable))
```

These kvlang-level highlights still apply to the property_value node in the HOST tree. The Python injection provides ADDITIONAL highlighting within the same text range. Most editors layer these: kvlang highlights win for nodes where they apply, Python fills in the gaps. This is exactly how HTML+JS works (HTML highlights for tags, JS highlights for script content).

### What about `self`/`root`/`app` inside `dotted_ref`?
The current `dotted_ref` is an opaque single token (e.g., `self.pos` is one token). The kvlang grammar can't highlight `self` differently within it. With Python injection, the Python parser sees `self.pos` as `(attribute (identifier) (identifier))` and can highlight `self` as `@variable.builtin`. This is a BONUS benefit of the injection approach — it solves the long-standing `self`/`root`/`app` inside dotted_ref issue without any grammar changes.

### Risks
- **Multiline Python expressions**: Kivy officially keeps property values to one line, but some users use parentheses for implicit line joining. The current grammar and this injection approach only handle single-line values. This is a pre-existing limitation. A future change could handle multiline values by updating the external scanner to recognize bracket-based line continuation (like Python's parser does).
- **Performance with many properties**: Each property value triggers a Python sub-parse. In practice this is fine (same pattern as HTML+JS injection, tree-sitter is incremental), but worth noting for very large .kv files with hundreds of properties.
- **Language detection**: The editor must have `python` registered as an available tree-sitter grammar. This is the editor's responsibility, not the grammar's. Tree-sitter's injection mechanism gracefully handles missing languages (it silently skips injection).
- **`id:` declarations**: Uses `id_declaration` which does NOT use `property_value` — IDs are Kivy identifiers, not Python expressions. No injection needed there, and none happens.
- **`None` value edge case**: `color: None` currently shows NO named children in the CST (because `_none` is a hidden token). But `property_value`'s text range still covers `None`, so injection works.

### Ready for Proposal
**Yes.** The exploration is complete. The recommended approach (pure injection, no grammar changes) is well-understood, follows established tree-sitter patterns, requires minimal code change, and has no risks beyond the pre-existing single-line limitation.

**What the orchestrator should tell the user:**
1. Creating `queries/injections.scm` with a single 3-line pattern is sufficient — no grammar changes needed
2. `injection.include-children` is required because `property_value` has named children
3. The existing `_raw_value` hidden node is NOT a problem — it's a child of `property_value`, and `include-children` includes all child text
4. All Kivy property values (including event handler bodies) are valid Python expressions — injection works universally
5. Bonus: Python injection naturally solves the `self`/`root`/`app` highlighting inside `dotted_ref` (the Python parser handles attribute access correctly)
6. The change requires adding the injection path to `tree-sitter.json` for explicit reference
