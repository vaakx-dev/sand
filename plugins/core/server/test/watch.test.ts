import { expect, test } from 'bun:test'
import { createWatchers } from '../src/stream/watch'

test('a socket sees its focus and the threads it watches, and nothing else', () => {
  const watchers = createWatchers<string>()
  watchers.focus('page', 'current')
  watchers.watch('page', ['side', 'other'])
  expect(watchers.sees('page', 'current')).toBe(true)
  expect(watchers.sees('page', 'side')).toBe(true)
  expect(watchers.sees('page', 'other')).toBe(true)
  expect(watchers.sees('page', 'unrelated')).toBe(false)
})

test('each watch request replaces the set and leaves the focus alone', () => {
  const watchers = createWatchers<string>()
  watchers.focus('page', 'current')
  watchers.watch('page', ['side'])
  watchers.watch('page', ['other'])
  expect(watchers.sees('page', 'side')).toBe(false)
  expect(watchers.sees('page', 'other')).toBe(true)
  expect(watchers.sees('page', 'current')).toBe(true)
  watchers.focus('page', 'next')
  expect(watchers.sees('page', 'other')).toBe(true)
})

test('watching is not focusing, and a closed socket forgets its watches', () => {
  const watchers = createWatchers<string>()
  watchers.focus('page', 'current')
  watchers.watch('page', ['side'])
  expect(watchers.focused('side')).toBe(false)
  expect(watchers.focused('current')).toBe(true)
  watchers.forget('page')
  watchers.focus('page', undefined)
  expect(watchers.sees('page', 'side')).toBe(false)
})

test('other sockets keep their own watches', () => {
  const watchers = createWatchers<string>()
  watchers.focus('one', undefined)
  watchers.focus('two', undefined)
  watchers.watch('one', ['side'])
  expect(watchers.sees('one', 'side')).toBe(true)
  expect(watchers.sees('two', 'side')).toBe(false)
})
