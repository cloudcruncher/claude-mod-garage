import { expect, test } from 'claude-code/testing'
import { DEFAULTS, expand, parseExtra } from './lib'

test('expand replaces known snippets only', () => {
  const s = { a: 'AAA', 'b-c': 'BBB' }
  expect(expand('do ;a now', s)).toBe('do AAA now')
  expect(expand(';a and ;b-c', s)).toBe('AAA and BBB')
  expect(expand('keep ;nope and a;a and x;a', s)).toBe('keep ;nope and a;a and x;a')
})

test('parseExtra tolerates bad input', () => {
  expect(parseExtra('{"ship":"go"}')).toEqual({ ship: 'go' })
  expect(parseExtra('not json')).toEqual({})
  expect(parseExtra('')).toEqual({})
  expect(parseExtra('{"bad key":"x","n":3}')).toEqual({})
})

test('defaults exist', () => {
  expect(Object.keys(DEFAULTS)).toContain('review')
})
