# tree-sitter-kivy

[Tree-sitter](https://tree-sitter.github.io/) grammar for the [Kivy KV language](https://kivy.org/doc/stable/guide/lang.html) (`.kv` files).

## Status

The grammar covers the full KV language syntax:

- **Directives**: `#:import`, `#:set`, `#:kivy`, `#:include`
- **Rules**: root (`Name:`), dynamic class (`<Name@Base>:`), template (`[Name]:`)
- **Class rules**: multiclass (`<A, B>:`), global (`<>:`), negated (`<-Name>:`)
- **Widget declarations**: nested children, arbitrary depth
- **Properties**: `name: value` with raw Python expressions
- **Canvas blocks**: `canvas:`, `canvas.before:`, `canvas.after:` with instructions
- **Event bindings**: single-line `on_event: expr` and multi-line `on_event:` bodies
- **ID declarations**: `id: name` (bare or quoted)
- **Comments**: `# ...` lines
- **Python injection**: property values and event bodies get Python syntax highlighting

All standard query files included: highlights, folds, indents, locals, tags, and injections.

## Building

```bash
# Install dependencies
npm install

# Generate parser from grammar
npx tree-sitter generate

# Build WASM
npx tree-sitter build --wasm

# Run corpus tests
npx tree-sitter test

# Run e2e verification
npm run test:e2e
```

## Installation

### Neovim (nvim-treesitter)

```lua
-- If registered in nvim-treesitter:
:TSInstall kivy

-- Or from source:
:TSInstallFromGrammar kivy https://github.com/tree-sitter/tree-sitter-kivy
```

### Helix

Add to your `languages.toml`:

```toml
[[language]]
name = "kv"
scope = "source.kv"
injection-regex = "kv"
file-types = ["kv"]

[language.tree-sitter]
grammar = "kivy"
```

Then fetch and build the grammar:

```bash
hx --grammar fetch
hx --grammar build
```

### Node.js

```js
const Parser = require('tree-sitter');
const Kivy = require('tree-sitter-kivy');

const parser = new Parser();
parser.setLanguage(Kivy);

const tree = parser.parse('#:kivy 2.0\nBoxLayout:\n    text: "Hello"');
console.log(tree.rootNode.toString());
```

### Python

```python
from tree_sitter import Language, Parser

KIVY_LANGUAGE = Language('path/to/tree-sitter-kivy.so', 'kivy')
parser = Parser()
parser.set_language(KIVY_LANGUAGE)
```

### Rust

```toml
[dependencies]
tree-sitter-kivy = "0.1"
```

```rust
use tree_sitter::Parser;

fn main() {
    let mut parser = Parser::new();
    parser.set_language(&tree_sitter_kivy::LANGUAGE.into())
        .expect("Error loading Kivy KV parser");
}
```

## Editor Support

| Editor | Integration |
|---|---|
| Neovim | nvim-treesitter (`:TSInstall kivy`) |
| Helix | Built-in grammar support via `languages.toml` |
| Zed | Via [Zed extension](https://zed.dev/docs/extensions/developing-extensions) |
| VSCode | Via WASM-based extension |
| Sublime Text | Via `.wasm` consumption |

## Queries

- **`highlights.scm`** — Syntax highlighting (cross-editor, no predicates)
- **`folds.scm`** — Foldable regions (rules, widgets, canvas, event bodies)
- **`indents.scm`** — Indentation anchors after block headers
- **`locals.scm`** — Scopes, definitions, and references
- **`tags.scm`** — Document symbols and outline navigation
- **`injections.scm`** — Python injection into property values and event bodies

## Testing

```bash
# Corpus tests (tree-sitter native)
npx tree-sitter test

# E2E verification (parse fixtures + query validation + WASM build)
npm run test:e2e
```

## License

MIT
