#include "tree_sitter/parser.h"
#include <stdbool.h>
#include <stdint.h>
#include <stdlib.h>
#include <string.h>

#define MAX_INDENT_STACK 32

enum TokenType {
    NEWLINE,
    INDENT,
    DEDENT,
    BREAK,
    DIRECTIVE_START,
};

typedef struct {
    int32_t depth;
    int32_t indent_stack[MAX_INDENT_STACK];
    int32_t pending_col; // -1 means no pending dedent; >= 0 means more dedents needed
} Scanner;

static void advance_line(TSLexer *lexer);
static int32_t current_stack_top(Scanner *scanner);

void *tree_sitter_kivy_external_scanner_create(void) {
    Scanner *scanner = (Scanner *)calloc(1, sizeof(Scanner));
    if (scanner) {
        scanner->indent_stack[0] = 0;
        scanner->depth = 1;
        scanner->pending_col = -1;
    }
    return scanner;
}

void tree_sitter_kivy_external_scanner_destroy(void *payload) {
    if (payload) {
        free(payload);
    }
}

unsigned tree_sitter_kivy_external_scanner_serialize(
    void *payload, char *buffer
) {
    Scanner *scanner = (Scanner *)payload;
    // Pack: indent_stack data, then depth byte, then pending_col as 4 bytes
    size_t count = (size_t)scanner->depth;
    if (count > MAX_INDENT_STACK) {
        count = MAX_INDENT_STACK;
    }
    size_t data_size = count * sizeof(int32_t);
    size_t offset = 0;
    if (count > 0) {
        memcpy(buffer, scanner->indent_stack, data_size);
    }
    offset = data_size;
    buffer[offset] = (char)count;
    offset += 1;
    memcpy(buffer + offset, &scanner->pending_col, sizeof(int32_t));
    offset += sizeof(int32_t);
    return offset;
}

void tree_sitter_kivy_external_scanner_deserialize(
    void *payload, const char *buffer, unsigned length
) {
    Scanner *scanner = (Scanner *)payload;
    scanner->pending_col = -1;
    if (length == 0) {
        scanner->depth = 1;
        scanner->indent_stack[0] = 0;
        return;
    }
    // Need at least 5 bytes (depth byte + 4-byte pending_col)
    if (length < 5) {
        scanner->depth = 1;
        scanner->indent_stack[0] = 0;
        return;
    }
    size_t data_size = length - 5;
    size_t count = (size_t)buffer[data_size];
    if (count > MAX_INDENT_STACK || count < 1) {
        scanner->depth = 1;
        scanner->indent_stack[0] = 0;
        return;
    }
    size_t expected_size = count * sizeof(int32_t) + 1 + sizeof(int32_t);
    if (length != expected_size) {
        scanner->depth = 1;
        scanner->indent_stack[0] = 0;
        return;
    }
    if (data_size > 0) {
        memcpy(scanner->indent_stack, buffer, data_size);
    }
    scanner->depth = (int32_t)count;
    if (scanner->depth < 1) {
        scanner->depth = 1;
        scanner->indent_stack[0] = 0;
    }
    memcpy(&scanner->pending_col, buffer + data_size + 1, sizeof(int32_t));
}

// Consumes rest of line after '#' has been consumed by caller.
// Returns true and consumes ':' if '#:' was found; otherwise
// consumes rest of line and returns false.
static bool try_directive_start(TSLexer *lexer) {
    if (lexer->lookahead == ':') {
        lexer->advance(lexer, false);
        return true;
    }
    advance_line(lexer);
    return false;
}

bool tree_sitter_kivy_external_scanner_scan(
    void *payload, TSLexer *lexer, const bool *valid_symbols
) {
    Scanner *scanner = (Scanner *)payload;

    // ---------------------------------------------------------------
    // Step 0: Handle pending multi-level dedent
    // After a previous \n processing detected col < stack_top, we may
    // need to emit multiple DEDENTs. Each call emits one DEDENT until
    // the target indent level is reached.
    // ---------------------------------------------------------------
    if (scanner->pending_col >= 0 && valid_symbols[DEDENT]) {
        int32_t top = current_stack_top(scanner);
        if (top > scanner->pending_col) {
            scanner->depth--;
            lexer->result_symbol = DEDENT;
            // Check if we need still more
            int32_t new_top = current_stack_top(scanner);
            if (new_top <= scanner->pending_col) {
                scanner->pending_col = -1; // done
            }
            return true;
        }
        // Already at correct level, clear
        scanner->pending_col = -1;
    }

    // ---------------------------------------------------------------
    // Step 0b: Handle _break requests
    // _break consumes blank lines and comments between top-level rules.
    // Only fires when BREAK is the ONLY valid external token.
    // ---------------------------------------------------------------
    if (valid_symbols[BREAK]
        && !valid_symbols[NEWLINE]
        && !valid_symbols[INDENT]
        && !valid_symbols[DEDENT]) {

        // Skip whitespace before blanks
        while (lexer->lookahead == ' ' || lexer->lookahead == '\t' || lexer->lookahead == '\r') {
            lexer->advance(lexer, true);
        }

        // Consume blank lines and comment/directive lines
        bool consumed = false;
        while (lexer->lookahead == '\n' || lexer->lookahead == '#') {
            if (lexer->lookahead == '\n') {
                consumed = true;
                lexer->advance(lexer, true);
                continue;
            }
            if (lexer->lookahead == '#') {
                lexer->advance(lexer, false);  // consume '#'
                if (lexer->lookahead == ':') {
                    // We found '#:' during BREAK — emit DIRECTIVE_START
                    lexer->advance(lexer, false);  // consume ':'
                    lexer->result_symbol = DIRECTIVE_START;
                    return true;
                }
                // Plain '#' — consume rest of line, loop continues
                advance_line(lexer);
                consumed = true;
                continue;
            }
        }

        if (!consumed) {
            return false;
        }

        // Blanks consumed. If at EOF, still emit BREAK — the grammar
        // has optional(_break) at the end of source_file to catch it.
        lexer->result_symbol = BREAK;
        return true;
    }

    // ---------------------------------------------------------------
    // Step 0c: Handle DIRECTIVE_START requests
    // Only checked when DIRECTIVE_START is a valid symbol (at
    // source_file level). Fires between BREAK detection and inline
    // whitespace skipping. If no '#' found, fall through to the
    // rest of the scanner so other tokens can be produced.
    // ---------------------------------------------------------------
    if (valid_symbols[DIRECTIVE_START]) {
        // Skip leading whitespace before checking for '#'
        while (lexer->lookahead == ' ' || lexer->lookahead == '\t') {
            lexer->advance(lexer, true);
        }
        if (lexer->lookahead == '#') {
            lexer->advance(lexer, false);  // consume '#'
            if (lexer->lookahead == ':') {
                lexer->advance(lexer, false);  // consume ':'
                lexer->result_symbol = DIRECTIVE_START;
                return true;
            }
            // Plain '#' at start of line — parser was expecting
            // directive but found plain comment. Consume rest of
            // line and return false so parser tries other paths.
            advance_line(lexer);
            return false;
        }
        if (lexer->lookahead == ':') {
            // '#' was already consumed by \n processing (Step 2)
            // when it detected '#:' at column 0. Consume ':' and
            // emit DIRECTIVE_START.
            lexer->advance(lexer, false);
            lexer->result_symbol = DIRECTIVE_START;
            return true;
        }
        // Not '#' or ':' — fall through to other token possibilities
        // (BREAK, NEWLINE, etc. via Steps 1-4)
    }

    // ---------------------------------------------------------------
    // Step 1: Skip inline whitespace (tabs, spaces) and lone \r
    // ---------------------------------------------------------------
    while (lexer->lookahead == ' ' || lexer->lookahead == '\t') {
        lexer->advance(lexer, true);
    }
    if (lexer->lookahead == '\r') {
        lexer->advance(lexer, true);
    }

    // ---------------------------------------------------------------
    // Step 2: Process \n — count indentation, emit appropriate token
    // ---------------------------------------------------------------
    if (lexer->lookahead == '\n') {
        lexer->advance(lexer, false);

        // Count leading whitespace on the new line
        int32_t col = 0;
        while (lexer->lookahead == ' ' || lexer->lookahead == '\t') {
            if (lexer->lookahead == '\t') {
                col = (col / 8 + 1) * 8; // PEP 8 tab stops
            } else {
                col++;
            }
            lexer->advance(lexer, true);
        }

        // Skip blank and comment lines (they don't change indent)
        while (lexer->lookahead == '\n' || lexer->lookahead == '#' || lexer->lookahead == '\r') {
            if (lexer->lookahead == '\n') {
                lexer->advance(lexer, false);
                col = 0;
                while (lexer->lookahead == ' ' || lexer->lookahead == '\t') {
                    if (lexer->lookahead == '\t') {
                        col = (col / 8 + 1) * 8;
                    } else {
                        col++;
                    }
                    lexer->advance(lexer, true);
                }
            } else if (lexer->lookahead == '#') {
                lexer->advance(lexer, false);  // consume '#'
                if (lexer->lookahead == ':' && col == 0) {
                    // '#:' at column 0 during \n skip — this is a directive.
                    // Only consume '#' (already done), leave ':' for
                    // Step 0c on the next scanner call. The NEWLINE
                    // will be emitted at col==0, then DIRECTIVE_START
                    // will fire on the next scan.
                    // Do NOT consume the ':' or the rest of the line.
                } else if (lexer->lookahead == ':') {
                    // '#:' inside a rule body (col > 0) — consume as comment
                    advance_line(lexer);
                } else {
                    // Plain '#' — consume rest of line
                    advance_line(lexer);
                }
            } else if (lexer->lookahead == '\r') {
                lexer->advance(lexer, true);
            }
        }

        int32_t stack_top = current_stack_top(scanner);

        // At EOF: prefer NEWLINE if the parser wants it (completes a
        // rule body), otherwise DEDENT to close blocks.
        if (lexer->eof(lexer)) {
            // When the parser expects NEWLINE (e.g. after Widget:),
            // emit NEWLINE first so the rule body completes. The
            // next EOF scan call (Step 3) will handle the DEDENT.
            if (valid_symbols[NEWLINE]) {
                lexer->result_symbol = NEWLINE;
                return true;
            }
            if (scanner->depth > 1) {
                scanner->depth--;
                lexer->result_symbol = DEDENT;
                return true;
            }
            return false;
        }

        // Indent comparison
        if (col > stack_top) {
            if (scanner->depth >= MAX_INDENT_STACK) {
                // Stack overflow — use NEWLINE as safe fallback
                lexer->result_symbol = NEWLINE;
                return true;
            }
            scanner->indent_stack[scanner->depth] = col;
            scanner->depth++;
            lexer->result_symbol = INDENT;
            return true;
        }
        if (col < stack_top) {
            scanner->depth--;
            lexer->result_symbol = DEDENT;
            // If we still need more dedents, save target and emit
            // one DEDENT per scanner call until done.
            if (current_stack_top(scanner) > col) {
                scanner->pending_col = col;
            }
            return true;
        }

        // col == stack_top: same level, emit NEWLINE
        lexer->result_symbol = NEWLINE;
        return true;
    }

    // ---------------------------------------------------------------
    // Step 3: EOF — close remaining blocks or terminate
    // ---------------------------------------------------------------
    if (lexer->eof(lexer)) {
        // Prefer NEWLINE if the parser expects it (rule body completion)
        if (valid_symbols[NEWLINE]) {
            lexer->result_symbol = NEWLINE;
            return true;
        }
        if (scanner->depth > 1) {
            scanner->depth--;
            lexer->result_symbol = DEDENT;
            return true;
        }
        // Top-level EOF, file done
        return false;
    }

    // ---------------------------------------------------------------
    // Step 4: Content character (no preceding \n) — nothing for scanner
    // ---------------------------------------------------------------
    return false;
}

static int32_t current_stack_top(Scanner *scanner) {
    return scanner->depth > 0
        ? scanner->indent_stack[scanner->depth - 1]
        : 0;
}

static void advance_line(TSLexer *lexer) {
    while (lexer->lookahead != '\n' && !lexer->eof(lexer)) {
        if (lexer->lookahead == '\r') {
            lexer->advance(lexer, true);
            if (lexer->lookahead == '\n') {
                lexer->advance(lexer, true);
            }
            return;
        }
        lexer->advance(lexer, true);
    }
    if (lexer->lookahead == '\n') {
        lexer->advance(lexer, true);
    }
}