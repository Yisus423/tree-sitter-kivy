# Proposal: Tree-sitter Query Files for kvlang

## Intent

Create tree-sitter `.scm` query files for the kvlang grammar to enable syntax highlighting, local variable tracking, and document symbol navigation in editors (Neovim, Helix, Zed). The grammar is complete but has zero query files — editors see no highlighting or structure.

## Scope

### In Scope
1. `queries/highlights.scm` — syntax highlighting for all 23 named + 21 anonymous nodes
2. `queries/locals.scm` — scope boundaries, definition/reference tracking
3. `queries/tags.scm` — document symbols via `@name` + `@definition.*` convention
4. `tree-sitter.json` — add `locals` and `tags` entries if missing

### Out of Scope
- Grammar changes (no new nodes needed)
- Lua/Scheme predicates (`#any-of?`, `#match?`) — pure S-expression queries only
- Test infrastructure for `.scm` files (no standard exists)
- Editor-specific configs (Neovim, Helix, VSCode)

## Capabilities

### New Capabilities
- `tree-sitter-queries`: tree-sitter query files for kvlang — highlights, locals, tags

### Modified Capabilities
- None

## Approach

One query file per concern, using Neovim-standard capture names (`@keyword`, `@string`, `@type`, `@property`, `@variable`, `@function`, `@local.*`, `@definition.*`). Specific parent-context captures (e.g., `(property name: (identifier))`) ordered before catch-all `(identifier) @variable` to avoid capture conflicts. All matches are pure S-expressions — no predicates — for cross-editor portability. Follow the mapping from exploration analysis exactly.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `queries/highlights.scm` | New | All node/token → highlight group mappings |
| `queries/locals.scm` | New | Scope + definition/reference captures |
| `queries/tags.scm` | New | Document symbol navigation captures |
| `tree-sitter.json` | Modified | Add `locals`/`tags` entries to grammar config |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Query ordering fragility | Med | Document ordering rules; test against sample .kv files |
| No test harness for .scm | High | Manual verification against known .kv files required |
| `dotted_ref` single-token limit | Low | Acceptable — context via parent node is sufficient |

## Rollback Plan

Delete or revert the three query files and undo `tree-sitter.json` changes. No grammar or runtime code is affected — this is purely additive.

## Dependencies

- tree-sitter-kivy grammar (already complete and stable)

## Success Criteria

- [ ] `highlights.scm` renders all node types with correct capture groups in an editor
- [ ] `locals.scm` tracks scopes and definitions/references correctly
- [ ] `tags.scm` produces correct document symbols via `tree-sitter tags`
- [ ] `tree-sitter.json` validates and grammars load without error
