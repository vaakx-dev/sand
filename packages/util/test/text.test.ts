import { expect, test } from 'bun:test'
import { charStart, clip, head, inputText, oneLine, tail, wellFormed } from '../src'

const bold = '𝗧𝗵𝗲'

test('cuts never split a character made of two code units', () => {
  expect(head(`a${bold}`, 2)).toBe('a')
  expect(head(`a${bold}`, 3)).toBe('a𝗧')
  expect(tail(`${bold}b`, 2)).toBe('b')
  expect(tail(`${bold}b`, 3)).toBe('𝗲b')
  expect(clip(`a${bold}`, 2)).toBe('a…')
  expect(clip('short', 10)).toBe('short')
  expect(oneLine(`a ${bold}`, 3)).toBe('a …')
  expect(charStart(bold, 3)).toBe(2)
  expect(charStart(bold, 4)).toBe(4)
})

test('wellFormed replaces lone halves everywhere in a request and keeps the rest', () => {
  const half = '𝗧'.slice(0, 1)
  const request = { system: `s${half}`, messages: [{ role: 'user', content: [{ type: 'text', text: `t${half}` }] }], count: 2, native: undefined }
  expect(wellFormed(request)).toEqual({ system: 's\uFFFD', messages: [{ role: 'user', content: [{ type: 'text', text: 't\uFFFD' }] }], count: 2, native: undefined })
  expect(wellFormed(bold)).toBe(bold)
})

test('input text reads nested input as its short values, skipping long ones', () => {
  const edits = [
    { path: 'a.ts', old_string: 'const a = 1', new_string: 'const first = 1' },
    { path: 'b.ts', old_string: 'x\ny', new_string: 'z' },
  ]
  expect(inputText({ edits })).toBe('a.ts const a = 1 const first = 1 b.ts z')
  expect(inputText({ code: 'line one\nline two' })).toBe('line one line two')
  expect(inputText({ title: 'Plan', steps: ['a'] })).toBe('Plan')
})
