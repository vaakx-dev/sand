import { expect, test } from 'bun:test'
import type { LLMEvent } from '@sand/accounts/contract'
import { createCoalescer } from '../src/stream/coalesce'

const session = { id: 'chat' }
const text = (value: string): LLMEvent => ({ type: 'text', index: 0, text: value })

const watch = (overdueMs = 1000) => {
  const sent: string[] = []
  const coalescer = createCoalescer<typeof session>(event => sent.push(event.type === 'text' ? event.text : `<${event.type}>`), overdueMs)
  return { sent, coalescer }
}

test('the first words of a reply go out at once, later words wait for the end of their paragraph, and nothing is lost', () => {
  const { sent, coalescer } = watch()
  coalescer.push(text('Hello'), session)
  expect(sent).toEqual(['Hello'])

  coalescer.push(text(' there,'), session)
  coalescer.push(text(' friend.'), session)
  expect(sent).toEqual(['Hello'])

  coalescer.push(text('\n\nNext'), session)
  expect(sent).toEqual(['Hello', ' there, friend.\n\n'])

  coalescer.push({ type: 'block', index: 0, block: { type: 'text', text: '' } }, session)
  expect(sent).toEqual(['Hello', ' there, friend.\n\n', 'Next', '<block>'])
  coalescer.stop()
})

test('words held past the overdue time go out by whole lines', async () => {
  const { sent, coalescer } = watch(20)
  coalescer.push(text('Start'), session)
  coalescer.push(text(' of a line\nand half'), session)
  await Bun.sleep(60)
  expect(sent.join('')).toBe('Start of a line\nand half')
  expect(sent[1]).toBe(' of a line\n')
  coalescer.stop()
})
