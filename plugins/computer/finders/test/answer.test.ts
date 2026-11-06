import { expect, test } from 'bun:test'
import { answerOf } from '../src/providers/answer'

const image = { width: 1000, height: 500 }
const elements = [{ ref: '7', role: 'button', name: 'OK', box: { left: 0, top: 0, right: 0.1, bottom: 0.1 } }]

test('pixel answers become fractions of the image', () => {
  expect(answerOf('Sure: {"x": 250, "y": 100, "confidence": 0.8}', image, [])).toEqual({ hit: { kind: 'point', x: 0.25, y: 0.2 }, confidence: 0.8 })
})

test('refs must be one of the listed elements', () => {
  expect(answerOf('{"ref": 7}', image, elements)).toEqual({ hit: { kind: 'element', ref: '7' }, confidence: null })
  expect(answerOf('{"ref": "8"}', image, elements).hit).toBeNull()
})

test('not found, prose and broken JSON give no hit', () => {
  expect(answerOf('{"found": false}', image, []).hit).toBeNull()
  expect(answerOf('I cannot see it.', image, []).hit).toBeNull()
  expect(answerOf('{"x": 1,', image, []).hit).toBeNull()
})

test('text-only finders cannot answer with a point', () => {
  expect(answerOf('{"x": 5, "y": 5}', null, elements).hit).toBeNull()
})
