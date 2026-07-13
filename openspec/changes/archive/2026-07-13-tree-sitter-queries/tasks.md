# Tasks: Tree-sitter Query Files for kvlang

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~130–180 new, ~2 modified |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | auto-forecast |
| Chain strategy | size-exception |

```
Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low
```

All three query files are additive and mutually independent once `tree-sitter.json` is updated. A single PR suffices — well under the 400-line budget.

## Phase 1: highlights.scm

- [x] 1.1 Add `(comment) @comment @spell`, `(string) @string`, `(number) @number`, `(boolean) @boolean`, `"None" @constant.builtin` at top of `queries/highlights.scm`
- [x] 1.2 Add directive captures: `import`/`set`/`kivy`/`include` keywords, module/path/version values, alias `@module`, `@constant`, `@string.special.*`
- [x] 1.3 Add rule + widget context captures: root/class/template rule names `@type`/`@type.definition`, widget names `@type`, property names `@property`, class bases, negated identifiers
- [x] 1.4 Add canvas + event captures: `canvas`/`canvas.before`/`canvas.after` `@keyword`, canvas instruction names `@type`, event names `@attribute`, handlers `@function`/`@function.method`
- [x] 1.5 Add value + identifier captures: `id:` name `@variable`, `dotted_ref` `@variable.member`, `(identifier) @variable` catch-all last, punctuation `@punctuation.*`, operators `@operator`

## Phase 2: locals.scm

- [x] 2.1 Add scope captures: `(source_file) @local.scope`, `(root_rule) @local.scope`, `(class_rule) @local.scope`, `(template_rule) @local.scope`, `(widget_declaration) @local.scope`, canvas blocks
- [x] 2.2 Add definition captures: class/template/root names `@local.definition.type`, import alias `@local.definition.import`, set name `@local.definition.constant`, id name `@local.definition.variable`
- [x] 2.3 Add reference captures: widget names, class bases, template bases, canvas instruction names, event handler identifiers all as `@local.reference`

## Phase 3: tags.scm

- [x] 3.1 Add `@definition.class` tags: `(class_entry name: (identifier) @name)`, `(template_entry name: (identifier) @name)`, `(root_rule name: (identifier) @name)`
- [x] 3.2 Add `@definition.import`, `@definition.constant`, `@definition.variable` tags for import aliases, set names, and id declarations

## Phase 4: tree-sitter.json + verification

- [x] 4.1 Add `"locals": ["queries/locals.scm"]` and `"tags": ["queries/tags.scm"]` to the kivy grammar entry in `tree-sitter.json`
- [x] 4.2 Run `tree-sitter build --wasm` to verify config loads and grammar compiles (exit code 0 ✓)
- [x] 4.3 Load grammar + queries in Neovim (`:TSInstallFromGrammar kivy`) and verify highlights on a sample `.kv` file — manual step (reconciled stale checkbox by sdd-archive per user instruction: verify-report proves 12/12 complete, PASS verdict; sdd-apply could not automate this NVim-specific manual step)
