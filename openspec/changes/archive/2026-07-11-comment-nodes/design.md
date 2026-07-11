# Design: Comment Nodes

## Technical Approach

Make `#` comments visible in the CST by adding a `comment` grammar rule as an extra token, then modifying the external scanner at 5 sites to return `false` when encountering `#` instead of consuming the line. The DFA matches `# rest of line` as a `(comment)` extra node. The scanner retains full control over indent tracking — it just stops eating comment content.

## Architecture Decisions

### Decision: Comment as extra token

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Grammar rule in `extras` | `#` can appear anywhere the parser is; no structural changes needed | **Chosen** — minimal diffs, no grammar restructuring |
| Explicit rule in `source_file` | Requires adding comment to every `seq(...)` that allows it | Rejected — too invasive, breaks modularity |

### Decision: Scanner returns `false` on `#`

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Return `false` (let DFA match) | Consumed `\n` is one character ahead; accepted loss for `#` at directive-probe col 0 | **Chosen** — simple, predictable |
| Still consume rest of line, emit fake token | More scanner code, defeats purpose of DFA matching | Rejected |

### Decision: Step 0c preserves `#` consumption for `#:` probe

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Probe: consume `#`, check `:`, return false if not `:` | Consumed `#` is lost (no comment node) but rare | **Chosen** — keeps directive detection logic simple |
| Don't probe, let DFA match `#:...` as comment | Would break `#:` directive handling completely | Rejected |

## Data Flow

```
Input: "...\n    # comment\n    text:..."
                   │
Step 2: consume \n, count 4 spaces, lookahead = '#'
                   │
        return false ──→ DFA matches '# comment' as comment extra
                   │
        parser sees (comment) in CST
                   │
Next scanner call: lookahead = \n
        Step 2: consume \n, count 4, lookahead = 't'
        → emit INDENT → parser consumes, gets text: "hi"
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `grammar.js` | Modify | Add `comment` rule + register in `extras` |
| `src/scanner.c` | Modify | 5 sites: stop consuming `#` lines |
| `test/corpus/core-syntax.txt` | Modify | 4 expected trees gain `(comment)` node |
| `test/corpus/directives.txt` | Modify | 1-2 expected trees gain `(comment)` node |

## Interfaces / Contracts

```javascript
// grammar.js addition
comment: $ => token(seq('#', /[^\n]*/)),

// extras update
extras: $ => [/[ \t]/, $.comment],
```

**Scanner contract changes** (5 sites):

| Site | Location | Change |
|------|----------|--------|
| 1 | Step 0b ~L160 | Remove `#` from `while` condition; loop only handles `\n` |
| 2 | Step 0c ~L213 | Replace `advance_line(lexer);` with just `return false;` |
| 3 | Step 2 ~L256 | Replace `else if (lookahead == '#')` block with `return false;` |
| 4 | Step 2 ~L269-276 | Remove col-0 `#:` check (unreachable after Site 3) |
| 5 | Step 0b ~L166-178 | Remove `#` directive check (handled by Step 0c) |

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit | `tree-sitter test` corpus | Update expected S-expressions for comment-bearing cases; all other cases must remain identical |
| Integration | Comment in every grammar position | File-top, rule-body, before/after blank lines, multiple consecutive, EOF, `#:` at col > 0 |
| Edge | Directive at col 0 still works | `#:import`, `#:set`, `#:kivy` unchanged; `#:` at col > 0 → `(comment)` |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

No migration required. Grammar and scanner changes are backward-compatible: all 24 existing core-syntax corpus tests must pass unchanged (modulo comment-bearing ones gaining `(comment)` nodes).

## Open Questions

None.
