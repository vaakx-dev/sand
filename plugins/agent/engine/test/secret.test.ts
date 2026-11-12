import { secretMark } from '@sand/chats/contract'
import { startSand, type Sand } from '@sand/harness'
import type { Source } from '@sand/replay/contract'
import { tools } from '@sand/tools/contract'
import { afterEach, expect, test } from 'bun:test'
import { join } from 'node:path'
import { z } from 'zod'

let sand: Sand

afterEach(() => sand.stop())

const said = (text: string) => ({ type: 'text', text }) as const

type Body = { messages: { content: { type: string; input?: unknown }[] }[] }

const sentInput = (body: string) =>
  (JSON.parse(body) as Body).messages.flatMap(message => message.content).find(block => block.type === 'tool_use')?.input

const input = { name: 'Northbank', password: 'hunter2-correct-horse' }

const replies: Source['replies'] = [[{ type: 'call', id: 'c1', name: 'save_login', input }], [said('Saved.')], [said('Done.')]]

const saveLogin = (received: unknown[]) =>
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

test('a secret tool input reaches the tool but never the transcript or a later model request', async () => {
  sand = await startSand([{ id: 'fake', api: 'anthropic', models: ['m'], replies }])
  const received: unknown[] = []
  saveLogin(received)
  const chat = sand.chat('fake/m')

  await sand.turns.run(chat, 'Save my bank login')
  await sand.turns.run(chat, 'Thanks')

  const blanked = { name: 'Northbank', password: secretMark }
  const [, afterCall, nextTurn] = sand.requests('fake')
  expect(received).toEqual([input])
  expect(JSON.stringify(chat.entries())).not.toContain(input.password)
  expect(sentInput(afterCall!)).toEqual(blanked)
  expect(sentInput(nextTurn!)).toEqual(blanked)
})

test('an app that keeps its own copy of the chat is reopened from a blanked copy before the call goes back to the model', async () => {
  sand = await startSand([{ id: 'app', models: ['m'], replies }])
  const received: unknown[] = []
  saveLogin(received)
  const chat = sand.chat('app/m')

  await sand.turns.run(chat, 'Save my bank login')
  await sand.turns.run(chat, 'Thanks')

  expect(received).toEqual([input])
  expect(await Bun.file(join(sand.home, 'replay', 'app-thread-1.jsonl')).text()).not.toContain(input.password)
  expect(sand.native('app')).toEqual([
    { type: 'open', cwd: sand.home },
    { type: 'send', text: 'Save my bank login' },
    { type: 'close' },
    { type: 'open', cwd: sand.home, resume: 'app-thread-1' },
    { type: 'send', text: '[Result of call c1]\nSaved' },
    { type: 'send', text: 'Thanks' },
  ])
})
