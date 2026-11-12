import { startSand, type Sand } from '@sand/harness'
import { tools } from '@sand/tools/contract'
import { afterEach, expect, test } from 'bun:test'
import { z } from 'zod'

let sand: Sand

afterEach(() => sand.stop())

const said = (text: string) => ({ type: 'text', text }) as const

type Body = { messages: { content: { type: string; input?: unknown }[] }[] }

const sentInput = (body: string) =>
  (JSON.parse(body) as Body).messages.flatMap(message => message.content).find(block => block.type === 'tool_use')?.input

test('a secret tool input reaches the tool but never the transcript or a later model request', async () => {
  const input = { name: 'Northbank', password: 'hunter2-correct-horse' }
  sand = await startSand([{ id: 'fake', api: 'anthropic', models: ['m'], replies: [[{ type: 'call', name: 'save_login', input }], [said('Saved.')], [said('Done.')]] }])
  const received: unknown[] = []
  sand.app.get(tools)!.register({
    name: 'save_login',
    description: 'Save a login',
    input: z.object({ name: z.string(), password: z.string() }),
    secret: ['password'],
    run: given => {
      received.push(given)
      return 'Saved'
    },
  })
  const chat = sand.chat('fake/m')

  await sand.turns.run(chat, 'Save my bank login')
  await sand.turns.run(chat, 'Thanks')

  const blanked = { name: 'Northbank', password: '[secret]' }
  const [, afterCall, nextTurn] = sand.requests('fake')
  expect(received).toEqual([input])
  expect(JSON.stringify(chat.entries())).not.toContain(input.password)
  expect(sentInput(afterCall!)).toEqual(blanked)
  expect(sentInput(nextTurn!)).toEqual(blanked)
})
