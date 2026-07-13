# Design: Tree-sitter Query Files for kvlang

## Technical Approach

Create three standalone `.scm` query files mapping kvlang CST nodes to Neovim-standard capture groups. The grammar has 23 named + 21 anonymous nodes — semantic meaning is entirely parent-context dependent since all names are `identifier` tokens. The design uses **most-specific-first ordering** to prioritize parent-context captures over catch-all `(identifier)` rules. No predicates — pure S-expressions for cross-editor portability.

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
|---|---|---|---|
| **Predicate approach** | Pure S-expressions, no predicates | `#any-of?`, `#match?` for finer control | Predicates are engine-specific (Lua in Neovim, Scheme in Helix). Pure S-exprs work everywhere. |
| **Query ordering** | Most-specific → most-general (top-down) | Reverse (general first) | Tree-sitter query engines match first-pattern-wins semantics. Parent-context captures would lose to catch-all `(identifier)` if ordered second. |
| **Anonymous token matching** | Quoted string sets: `["canvas" "canvas.before"] @keyword` | Field-based matching `(canvas_block name: _ @keyword)` | Simpler, no dependency on hidden rule structure, works identically in all editors. |
| **File split** | One file per concern (highlights, locals, tags) | Single combined file | tree-sitter expects separate files per concern in `tree-sitter.json`. Standard convention across all major grammars. |
| **Wrapped value navigation** | Descendant matching through intermediate nodes | Direct field matching | `property_value` wraps typed values in `property` and `event_binding` handlers. Query `(property value: (property_value (dotted_ref) @variable.member))` navigates through the intermediate node. |

## Data Flow

```
kv file ──► tree-sitter parser ──► CST (concrete syntax tree)
                                         │
                    ┌────────────────────┼────────────────────┐
                    ▼                    ▼                    ▼
           highlights.scm          locals.scm            tags.scm
                    │                    │                    │
                    ▼                    ▼                    ▼
            Syntax colours         Scope tracking       Document symbols
            (editor render)      (LSP, folding)      (outline, ctrl-p)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `queries/highlights.scm` | Create | All node → highlight group mappings (~80 lines). Ordered: parent-context captures, then anonymous tokens, then catch-all `(identifier) @variable`. |
| `queries/locals.scm` | Create | Scope boundaries (`source_file`, `root_rule`, `class_rule`, `template_rule`, `widget_declaration` → `@local.scope`) + definitions/references. |
| `queries/tags.scm` | Create | Document symbols: `@name` on identifier + `@definition.*` on parent node, per `tree-sitter tags` convention. |
| `tree-sitter.json` | Modify | Add `"locals": ["queries/locals.scm"]` and `"tags": ["queries/tags.scm"]` to the kivy grammar entry. |

## Interfaces / Contracts

**Capture contract for `highlights.scm`** — every named and anonymous node is matched exactly once. Key patterns:

```scheme
; Parent-context captures (ordered first)
(property name: (identifier) @property)
(widget_declaration name: (identifier) @type)
(event_binding handler: (property_value (dotted_ref) @function.method))

; Anonymous token sets
["canvas" "canvas.before" "canvas.after"] @keyword
["(" ")" "[" "]" "{" "}" "<" ">"] @punctuation.bracket

; Catch-all (last)
(identifier) @variable
```

**`locals.scm` scope model**: Every rule body and widget declaration creates a scope boundary. Definitions tracked: type (class/template/root-rule names), import (aliases), constant (`#:set`), variable (`id:` names). All other identifiers outside scopes are references.

**`tags.scm` navigation model**: Each definition-level node produces one symbol. The `@name` capture marks the identifier text; `@definition.*` on the parent makes the whole node the symbol range.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Manual | Correct captures on sample `.kv` files | Load grammar + queries in Neovim, verify highlights render correctly |
| Manual | Scope tracking in `locals.scm` | Verify `tree-sitter tags` or LSP shows correct scopes in test file |
| Manual | `tree-sitter.json` validity | Verify `tree-sitter build --wasm` succeeds with new config |
| Syntax | Query file syntax | Parse each `.scm` file with tree-sitter's query parser to catch syntax errors |

No automated test runner exists for `.scm` query files. Manual verification against known `.kv` fixtures is the standard approach.

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

No migration required. This is purely additive — new files + config extension. Delete the three `.scm` files and revert `tree-sitter.json` to roll back.

## Open Questions

None — the grammar is complete and the mapping is exhaustively specified.
