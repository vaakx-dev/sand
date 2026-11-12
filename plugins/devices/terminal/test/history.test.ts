import { expect, test } from 'bun:test'
import { createHistory } from '../src/runtime/history'
import { withoutQueries } from '../src/runtime/replay'

const grid = { cols: 80, rows: 24 }

test('keeps the most recent output under its limit, read by absolute offsets', () => {
  const history = createHistory(10, grid)
  history.append('abcdef')
  history.append('ghijkl')
  expect([history.start(), history.end()]).toEqual([2, 12])
  expect(history.read(4, 9)).toBe('efghi')
  expect(history.read(0, 12)).toBe('cdefghijkl')
})

test('never cuts a frame inside a character, and starts a recent screen at a line', () => {
  const history = createHistory(100, grid)
  history.append('ab😀')
  expect(history.cut(0, 3)).toBe(2)
  expect(history.cut(0, 4)).toBe(4)

  const lines = createHistory(12, grid)
  lines.append('first\nsecond\nthird\n')
  expect(lines.read(lines.recent(12), lines.end())).toBe('third\n')
  expect(createHistory(100, grid).recent(5)).toBe(0)
})

test('remembers the size each part of the output was drawn at, and never cuts a frame across a resize', () => {
  const narrow = { cols: 40, rows: 12 }
  const history = createHistory(10, grid)
  history.append('wide')
  history.resize(narrow)
  history.append('narrow')
  expect([history.gridAt(0), history.gridAt(4), history.grid()]).toEqual([grid, narrow, narrow])
  expect(history.cut(0, 100)).toBe(4)
  expect(history.cut(4, 100)).toBe(10)
  history.append('more')
  expect(history.gridAt(history.start())).toEqual(narrow)
})

test('replays leave out questions the terminal would answer, and keep everything that draws', () => {
  const drawn = '\x1b[31mred\x1b[0m \x1b[2J\x1b[?1049h\x1b]0;title\x07 \x1b[5 q'
  const asked = '\x1b[6n\x1b[c\x1b[>0c\x1b[?2004$p\x1b[>q\x1b[?u\x1b]11;?\x07\x1bP$qm\x1b\\'
  expect(withoutQueries(`${drawn}${asked}done`)).toBe(`${drawn}done`)
})
