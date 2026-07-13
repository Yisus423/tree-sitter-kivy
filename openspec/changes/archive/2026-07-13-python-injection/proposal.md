# Proposal: Python Injection in Property Values

## Intent

Add Python syntax highlighting to Kivy property values via tree-sitter language injection. Kivy property values are Python expressions by design, but the current grammar has no injection support — editors cannot highlight Python syntax inside .kv files.

## Scope

### In Scope
- Create `queries/injections.scm` with a single pattern mapping `property_value` → Python
- Add `"injections"` key to `tree-sitter.json`
- Existing kvlang highlight/tag/locals queries remain untouched

### Out of Scope
- Grammar changes (no edit to `grammar.js`)
- Multiline expression support (pre-existing limitation)
- Test corpus changes (no new test files needed)
- Changes to `highlights.scm`, `locals.scm`, or `tags.scm`

## Capabilities

### New Capabilities
- `python-injection`: Language injection query that maps Kivy `property_value` nodes to Python, enabling syntax highlighting for Python expressions within .kv files

### Modified Capabilities
- None — this is purely additive; no existing spec behavior changes

## Approach

Add an `injections.scm` query using `injection.include-children` so the full `property_value` text range is re-parsed as Python. The node range already spans the complete expression text (verified in exploration), making this a zero-grammar-change solution.

```scm
((property_value) @injection.content
 (#set! injection.language "python")
 (#set! injection.include-children))
```

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `queries/injections.scm` | New | Python injection query for property_value |
| `tree-sitter.json` | Modified | Add `"injections"` key to grammar config |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Missing Python parser in editor | Low | Injection silently skipped; no crash |
| Highlight conflicts with kvlang layer | Low | Orthogonal layer — both parse trees coexist |
| Performance with many properties | Low | Tree-sitter incremental parse; same as HTML+JS |

## Rollback Plan

Revert `tree-sitter.json` and delete `queries/injections.scm`. All existing kvlang functionality is preserved since no grammar changes were made.

## Dependencies

- Python tree-sitter parser always available in user's editor (confirmed)

## Success Criteria

- [ ] `property_value` nodes are re-parsed and highlighted as Python in the editor
- [ ] `tree-sitter test` still passes (zero grammar changes)
- [ ] Existing kvlang highlights remain visible alongside Python injection
