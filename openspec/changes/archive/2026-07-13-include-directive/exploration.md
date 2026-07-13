**Status**: success
**Summary**: Explored Kivy's `#:include` directive syntax and semantics, analyzed the existing grammar/scanner infrastructure, and determined that adding `include_directive` requires only grammar.js and test changes — no scanner modifications. Recommended approach: simple `directive_value`-based parsing (consistent with `#:kivy`) with no grammar-level `force` keyword parsing.
**Artifacts**: Engram `sdd/include-directive/explore` | `openspec/changes/include-directive/exploration.md`
**Next**: sdd-propose
**Risks**: GLR conflict if optional `force` keyword is parsed at grammar level; path field includes leading whitespace (consistent with existing directive conventions)
**Skill Resolution**: paths-injected

## Exploration: include-directive

### Current State

The directives system in `grammar.js` uses a consistent pattern:

```
$._directive_start → keyword → fields → $._newline
```

- `_directive_start` is an **external token** emitted by `src/scanner.c` when it detects `#:` at column 0 (or during blank-line/comment BREAK scanning)
- After `_directive_start`, each directive rule matches a known keyword string literal (`'import'`, `'set'`, `'kivy'`) followed by named fields (identifiers or `$.directive_value`) and terminated by `$._newline`
- `directive_value: $ => token.immediate(/[^\n\r]+/)` captures everything to end-of-line as raw text, **including leading whitespace** (because `token.immediate` prevents extras from being consumed between the preceding token and the value)
- The `_directive` choice in `source_file` selects among `import_directive`, `set_directive`, `kivy_directive`
- **No scanner changes are needed** — the existing `DIRECTIVE_START` / `NEWLINE` / `BREAK` tokens handle any new directive

Current directives:

| Directive | Grammar rule | Fields |
|-----------|-------------|--------|
| `#:import` | `import_directive` | `alias` (identifier), `module` (directive_value) |
| `#:set` | `set_directive` | `name` (identifier), `value` (directive_value) |
| `#:kivy` | `kivy_directive` | `version` (directive_value) |

### What is `#:include`?

From Kivy's official documentation (added in v1.9.0) and the Python parser source code (`kivy/lang/parser.py`):

**Syntax**: `#:include [force] <file>`

| Aspect | Detail |
|--------|--------|
| Syntax | `#:include [force] <file>` — `force` is an optional keyword that causes the file to be unloaded and reloaded |
| Path format | Raw path to a `.kv` file. Kivy's runtime parser also handles quoted paths (`"path"` or `'path'`) and triple-quoted, but at the grammar level this is raw text |
| Extension | Kivy checks for `.kv` extension at runtime and warns if missing — not a parser concern |
| Position | Same as other directives — must be at column 0, before any rule headers |
| Nesting | Included files can themselves contain `#:include` directives (Kivy handles circular reference detection at runtime via `__KV_INCLUDES__` list) |
| Duplicates | Kivy tracks included files globally and warns on re-include unless `force` is specified |
| Error handling | File-not-found raises `ParserException` at **runtime** — not a concern for tree-sitter parsing |
| Can appear with | Yes — can be freely mixed with `#:import`, `#:set`, `#:kivy` directives |

**Kivy runtime parser behavior** (from `parser.py` `execute_directives`):

```python
elif cmd[:8] == 'include ':
    ref = cmd[8:].strip()
    force_load = False
    if ref[:6] == 'force ':
        ref = ref[6:].strip()
        force_load = True
    # Also handles quoted paths, extension check, duplicate guard
```

### Affected Areas

| File | Why affected |
|------|-------------|
| `grammar.js` | Must add `include_directive` rule and add it to the `_directive` choice |
| `test/corpus/directives.txt` | Must add test cases for `#:include` directive |
| `openspec/specs/kvlang-directives/spec.md` | Must add `#:include` requirements to the spec |
| `src/scanner.c` | **NOT affected** — existing `DIRECTIVE_START` / `NEWLINE` tokens handle `#:include` identically to other directives |

### Approaches

1. **Approach A: Simple `directive_value`-based (recommended)**

   `include_directive` captures the entire line after `include` as a single `directive_value` field (including `force` keyword if present). Exactly like `#:kivy` works.

   ```javascript
   include_directive: $ => seq(
     $._directive_start,
     'include',
     field('path', $.directive_value),
     $._newline,
   ),
   ```

   - Pros: Zero GLR conflicts, minimal grammar change, consistent with `#:kivy`, no scanner changes, fast to implement
   - Cons: `force` keyword is not parsed at the grammar level (captured as part of raw text) — consumers must parse it from the `directive_value` string
   - Effort: **Low** — ~5 lines added to `grammar.js`, ~3 test cases, ~1 spec section

2. **Approach B: Structured `force` + `path` fields**

   Parse `force` as an optional keyword and the path as a separate `directive_value` field. Requires a `choice` between `seq('force', field('path', $.directive_value))` and just `field('path', $.directive_value)`.

   ```javascript
   include_directive: $ => seq(
     $._directive_start,
     'include',
     choice(
       seq('force', field('path', $.directive_value)),
       field('path', $.directive_value),
     ),
     $._newline,
   ),
   ```

   - Pros: Tree-structure exposes `force` flag explicitly — consumers don't need string parsing
   - Cons: Potential GLR ambiguity (both branches can match when input starts with `force`), may need conflict declaration, more complex grammar, questionable value since `force` is runtime semantics (the tree-sitter grammar can't evaluate whether to force-load or not)
   - Effort: **Low-Medium** — similar code but may require conflict resolution + GLR ambiguity testing

### Recommendation

**Approach A** (Simple `directive_value`-based).

Rationale:
1. **Consistency**: `#:include` without `force` is structurally identical to `#:kivy` — keyword + raw rest-of-line. Treating it the same way keeps the grammar regular.
2. **The `force` keyword is runtime semantics**: Tree-sitter is a parsing library — it doesn't load or execute kv files. Parsing `force` at the grammar level adds complexity for zero syntactic benefit. Any tool consuming the CST (linter, formatter, language server) can trivially check `directive_value` for a leading `force` keyword if needed.
3. **No scanner changes** needed — the `_directive_start` token already handles any `#:` at column 0.
4. **No GLR conflicts** — straightforward LR(1) grammar addition.
5. **Minimal effort**: ~5 lines in `grammar.js`, plus tests and spec updates.

### Risks

- **Path field includes leading whitespace**: The `directive_value` token captures ` myfile.kv` (with leading space) due to `token.immediate` semantics. This is **consistent with existing directives** — `import_directive.module` and `kivy_directive.version` also include leading whitespace. Query authors must `.strip()` the value. This is documented behavior.
- **GLR conflict risk (Approach B only)**: Not applicable to Approach A. Mentioned only if the decision is revisited.
- **Backward compatibility**: Adding `include_directive` to the `_directive` choice is purely additive — existing directive tests pass unmodified. The spec already has a backward compatibility requirement.

### Ready for Proposal

**Yes** — ready for `sdd-propose`. The implementation path is clear:

1. Add `include_directive` rule to `grammar.js` (~5 lines)
2. Add to `_directive` choice (1 line change)
3. Add test cases to `test/corpus/directives.txt`
4. Update `openspec/specs/kvlang-directives/spec.md` with `#:include` requirements
5. Run `tree-sitter test` to verify all tests pass

No scanner changes, no build configuration changes, no dependency changes.
