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
  ],

  rules: {
    source_file: $ => seq(
      repeat(seq(optional($._break), $._rule)),
      optional($._break),
    ),

    _rule: $ => choice($.root_rule, $.class_rule),

    root_rule: $ => seq(
      field('name', $.identifier),
      ':',
      optional($._rule_body),
    ),

    class_rule: $ => seq(
      '<',
      field('name', $.identifier),
      '>',
      ':',
      optional($._rule_body),
    ),

    _rule_body: $ => choice(
      $._newline,
      seq($._indent, repeat($._declaration), $._dedent),
    ),

    _declaration: $ => choice(
      $.widget_declaration,
      $.event_binding,
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
      'on',
      '_',
      field('event', $.identifier),
      ':',
      field('handler', $.property_value),
      optional($._newline),
    ),

    id_declaration: $ => seq(
      'id',
      ':',
      field('name', choice($.identifier, $.string)),
      optional($._newline),
    ),

    property_value: $ => token.immediate(/[^\n\r]+/),

    identifier: $ => /[a-zA-Z_]\w*/,

    string: $ => choice(
      /'[^']*'/,
      /"[^"]*"/,
    ),
  },
});