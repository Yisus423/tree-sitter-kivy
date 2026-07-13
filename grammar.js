/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

module.exports = grammar({
  name: 'kivy',

  extras: $ => [/[ \t]/],

  externals: $ => [
    $._newline,
    $._indent,
    $._dedent,
    $._break,
    $._directive_start,
    $.comment,
  ],

  conflicts: $ => [
    [$._tuple_elements],
    [$._list_elements],
    [$._dict_entries],
  ],

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

    _rule: $ => choice($.root_rule, $.class_rule),

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
      field('value', $.property_value),
      optional($._newline),
    ),

    event_binding: $ => seq(
      field('event', $.event_name),
      ':',
      field('handler', $.property_value),
      optional($._newline),
    ),

    event_name: $ => token(seq('on', '_', /[a-zA-Z_]\w*/)),

    id_declaration: $ => seq(
      'id',
      ':',
      field('name', choice($.identifier, $.string)),
      optional($._newline),
    ),

    property_value: $ => seq(
      choice(
        $.string,
        $.number,
        $.boolean,
        $._none,
        $.tuple,
        $.list_value,
        $.dict_value,
        $.dotted_ref,
        $.identifier,
      ),
      optional($._raw_value),
    ),

    number: $ => token(seq(
      optional('-'),
      choice(
        seq(/[0-9]+/, '.', /[0-9]+/),
        /[0-9]+/,
        seq('.', /[0-9]+/),
      ),
    )),

    boolean: $ => token(choice('True', 'False')),

    _none: $ => token('None'),

    dotted_ref: $ => token(seq(
      /[a-zA-Z_]\w*/,
      '.',
      /[a-zA-Z_]\w*/,
      repeat(seq('.', /[a-zA-Z_]\w*/)),
    )),

    _typed_value: $ => choice(
      $.string,
      $.number,
      $.boolean,
      $._none,
      $.tuple,
      $.list_value,
      $.dict_value,
      $.dotted_ref,
      $.identifier,
    ),

    _dict_entry: $ => seq(
      field('key', $.string),
      ':',
      field('value', $._typed_value),
    ),

    _dict_entries: $ => seq(
      $._dict_entry,
      optional(seq(',', optional($._dict_entries))),
    ),

    dict_value: $ => seq(
      '{',
      optional($._dict_entries),
      optional(','),
      '}',
    ),

    _tuple_elements: $ => seq(
      $._typed_value,
      optional(seq(',', optional($._tuple_elements))),
    ),

    tuple: $ => seq(
      '(',
      optional($._tuple_elements),
      optional(','),
      ')',
    ),

    _list_elements: $ => seq(
      $._typed_value,
      optional(seq(',', optional($._list_elements))),
    ),

    list_value: $ => seq(
      '[',
      optional($._list_elements),
      optional(','),
      ']',
    ),

    _raw_value: $ => token(/[^\n\r]+/),

    comment: $ => token(seq('#', /[^\n]*/)),

    identifier: $ => /[a-zA-Z_]\w*/,

    string: $ => choice(
      /'[^']*'/,
      /"[^"]*"/,
    ),
  },
});
