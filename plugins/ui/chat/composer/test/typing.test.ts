import { afterEach, beforeEach, expect, jest, test } from 'bun:test'
import { createTyping } from '../src/typing'

beforeEach(() => {
  Object.assign(globalThis, { window: globalThis })
  jest.useFakeTimers()
})
afterEach(() => {
  jest.useRealTimers()
  Reflect.deleteProperty(globalThis, 'window')
})

test('a prompt shows at once while nobody types, and otherwise after 1.5 s without a keystroke', () => {
  const typing = createTyping()
  const shown: string[] = []
  typing.idle(() => shown.push('idle'))
  expect(shown).toEqual(['idle'])

  typing.typed()
  typing.idle(() => shown.push('held'))
  jest.advanceTimersByTime(1000)
  typing.typed()
  jest.advanceTimersByTime(1499)
  expect(shown).toEqual(['idle'])
  jest.advanceTimersByTime(1)
  expect(shown).toEqual(['idle', 'held'])
})

test('a cancelled prompt never shows, and stopping the composer shows what it held', () => {
  const typing = createTyping()
  const shown: string[] = []
  typing.typed()
  const cancel = typing.idle(() => shown.push('cancelled'))
  typing.idle(() => shown.push('held'))
  void cancel()
  typing.stop()
  expect(shown).toEqual(['held'])
  jest.advanceTimersByTime(2000)
  expect(shown).toEqual(['held'])
})
