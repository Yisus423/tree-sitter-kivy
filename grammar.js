/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

module.exports = grammar({
  name: 'kivy',
  word: $ => $.identifier,

  extras: $ => [/[ \t]/],

  externals: $ => [
    $._newline,
    $._indent,
    $._dedent,
    $._break,
    $._directive_start,
    $.comment,
  ],

  conflicts: $ => [],

  rules: {
    source_file: $ => seq(
      repeat(choice(
        $._directive,
        $.comment,
        seq(optional($._break), $._rule),
      )),
      optional($._break),
    ),

    _directive: $ => choice(
      $.import_directive,
      $.set_directive,
      $.kivy_directive,
      $.include_directive,
    ),

    import_directive: $ => seq(
      $._directive_start,
      'import',
      field('alias', $.identifier),
      field('module', $.directive_value),
      $._newline,
    ),

    set_directive: $ => seq(
      $._directive_start,
      'set',
      field('name', $.identifier),
      field('value', $.directive_value),
      $._newline,
    ),

    kivy_directive: $ => seq(
      $._directive_start,
      'kivy',
      field('version', $.directive_value),
      $._newline,
    ),

    include_directive: $ => seq(
      $._directive_start,
      'include',
      field('path', $.directive_value),
      $._newline,
    ),

    directive_value: $ => token.immediate(/[^\n\r]+/),

    _rule: $ => choice($.root_rule, $.class_rule, $.template_rule),

    root_rule: $ => seq(
      field('name', $.identifier),
      ':',
      optional($._rule_body),
    ),

    class_entry: $ => choice(
      seq(
        field('name', $.identifier),
        optional(seq('@', field('base', $.identifier),
          repeat(seq('+', field('base', $.identifier))))),
      ),
      seq(
        '@',
        field('base', $.identifier),
        repeat(seq('+', field('base', $.identifier))),
      ),
    ),

    class_rule: $ => seq(
      '<',
      choice(
        seq('-', field('negated', $.identifier)),
        seq(
          optional($.class_entry),
          repeat(seq(',', $.class_entry)),
        ),
      ),
      '>',
      ':',
      optional($._rule_body),
    ),

    template_entry: $ => seq(
      field('name', $.identifier),
      optional(seq('@', field('base', $.identifier),
        repeat(seq('+', field('base', $.identifier))))),
    ),

    template_rule: $ => seq(
      '[',
      $.template_entry,
      ']',
      ':',
      optional($._rule_body),
    ),

    _rule_body: $ => choice(
      $._newline,
      seq($._indent, repeat($._declaration), $._dedent),
    ),

    _canvas_header: $ => choice('canvas.before', 'canvas.after', 'canvas'),

    canvas_instruction: $ => choice(
      seq(field('name', $.identifier), ':', choice(
        $._newline,
        seq($._indent, repeat(choice($.property, $.comment)), $._dedent),
      )),
      seq(field('name', $.identifier), $._newline),
    ),

    canvas_block: $ => seq(
      field('name', $._canvas_header),
      ':',
      choice(
        $._newline,
        seq($._indent, repeat(choice(
          seq($.comment, optional($._newline)),
          $.canvas_instruction,
        )), $._dedent),
      ),
    ),

    _declaration: $ => choice(
      seq($.comment, optional($._newline)),
      $.canvas_block,
      $.event_binding,
      $.widget_declaration,
      $.id_declaration,
      $.property,
    ),

    widget_declaration: $ => seq(
      field('name', $.identifier),
      ':',
      choice($._newline, seq($._indent, repeat($._declaration), $._dedent), $._dedent),
    ),

    property: $ => seq(
      field('name', $.identifier),
      ':',
      field('value', $.value),
      optional($._newline),
    ),

    event_binding: $ => seq(
      field('event', $.event_name),
      ':',
      choice(
        field('handler', $.value),
        field('handler', $.event_body),
      ),
      optional($._newline),
    ),

    event_body: $ => seq(
      $._indent,
      repeat(choice(
        $._expression_line,
        seq($.comment, optional($._newline)),
      )),
      $._dedent,
    ),

    _expression_line: $ => seq(
      token(/[^\n\r]+/),
      optional($._newline),
    ),

    event_name: $ => token(seq('on', '_', /[a-zA-Z_]\w*/)),

    id_declaration: $ => seq(
      'id',
      ':',
      field('name', choice($.identifier, $.string)),
      optional($._newline),
    ),

    value: $ => token(/[^\n\r]+/),

    comment: $ => token(seq('#', /[^\n]*/)),

    identifier: $ => /[a-zA-Z_]\w*/,

    string: $ => choice(
      /'[^']*'/,
      /"[^"]*"/,
    ),
  },
});
