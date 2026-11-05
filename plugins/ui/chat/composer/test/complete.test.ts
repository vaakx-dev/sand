import { expect, test } from 'bun:test'
import { typedTrigger } from '../src/complete/detect'
import { merged } from '../src/complete/merge'
import type { Trigger } from '../src/contract'

const chars = ['@', '#', '$', '/']

test('a trigger starts a word and its query runs to the caret', () => {
  expect(typedTrigger('@', chars)).toEqual({ char: '@', query: '', from: 0 })
  expect(typedTrigger('look at @src/ma', chars)).toEqual({ char: '@', query: 'src/ma', from: 8 })
  expect(typedTrigger('first line\nfix #12', chars)).toEqual({ char: '#', query: '12', from: 15 })
  expect(typedTrigger('use\t$rev', chars)).toEqual({ char: '$', query: 'rev', from: 4 })
  expect(typedTrigger('mail me@home', chars)).toBeUndefined()
  expect(typedTrigger('@src done', chars)).toBeUndefined()
  expect(typedTrigger('cost 5$', chars)).toBeUndefined()
  expect(typedTrigger('see @src', ['#'])).toBeUndefined()
})

test('a quoted query keeps its spaces and drops the quote', () => {
  expect(typedTrigger('open @"My Docs/no', chars)).toEqual({ char: '@', query: 'My Docs/no', from: 5 })
  expect(typedTrigger('open @"My Docs/no"', chars)).toBeUndefined()
  expect(typedTrigger('open @"My\nDocs', chars)).toBeUndefined()
})

test('a command only starts the message', () => {
  expect(typedTrigger('/rel', chars)).toEqual({ char: '/', query: 'rel', from: 0 })
  expect(typedTrigger('/', chars)).toEqual({ char: '/', query: '', from: 0 })
  expect(typedTrigger('please /rel', chars)).toBeUndefined()
  expect(typedTrigger('x\n/rel', chars)).toBeUndefined()
  expect(typedTrigger(' /rel', chars)).toBeUndefined()
  expect(typedTrigger('/reload now', chars)).toBeUndefined()
  expect(typedTrigger('/rel', ['@'])).toBeUndefined()
})

test('triggers on one char merge into groups in order, each capped, under one limit', () => {
  const trigger = (label: string): Trigger => ({ char: '@', label, items: () => [], accept: () => '' })
  const files = trigger('files')
  const threads = trigger('threads')
  const items = (prefix: string, count: number) => Array.from({ length: count }, (_, index) => ({ label: `${prefix}${index}` }))

  const shown = merged(
    [
      { trigger: files, items: items('f', 12) },
      { trigger: threads, items: [] },
      { trigger: trigger('pull requests'), items: items('p', 3) },
    ],
    10,
    12,
  )

  expect(shown.map(({ group, item }) => `${group}:${item.label}`)).toEqual([...items('Files:f', 10).map(item => item.label), 'Pull requests:p0', 'Pull requests:p1'])
  expect(shown[0]?.trigger).toBe(files)
})
