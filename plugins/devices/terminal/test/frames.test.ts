import { expect, test } from 'bun:test'
import { applyFrame } from '../src/contract'

test('a page writes each part of the output once, whatever order of repeats it gets', () => {
  expect(applyFrame(0, { id: 't', data: 'hello', end: 5 })).toEqual({ offset: 5, write: 'hello', reset: false })
  expect(applyFrame(5, { id: 't', data: 'hello', end: 5 })).toEqual({ offset: 5, write: '', reset: false })
  expect(applyFrame(3, { id: 't', data: 'hello world', end: 11 })).toEqual({ offset: 11, write: 'lo world', reset: false })
  expect(applyFrame(8, { id: 't', data: 'ab', end: 6 })).toEqual({ offset: 8, write: '', reset: false })
  expect(applyFrame(2, { id: 't', data: 'later', end: 9 })).toBeUndefined()
  expect(applyFrame(40, { id: 't', data: 'screen', end: 12, reset: true })).toEqual({ offset: 12, write: 'screen', reset: true })
})
