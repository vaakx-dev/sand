import { botOpen, botSend } from '@sand/bot-turns/contract'
import { botCreate } from '@sand/bots/contract'
import type { Message } from '@sand/chats/contract'
import { expect, test } from 'bun:test'
import { answer, boot, model } from './boot'

test('with only Bots on, a bot answers', async () => {
  const sand = await boot(['bots'])
  try {
    const bot = await sand.ask(botCreate, { name: 'Helper', models: { main: { model: 'fake/m' }, quick: {} } })
    await sand.ask(botSend, { bot: bot.id, prompt: 'hi', clientRequestId: 'hi' })
    expect(await answer(sand, bot.id)).toBe('Hello from the bot')
  } finally {
    await sand.stop()
  }
}, 60_000)

test("with only Bots on, a bot's shell call runs without asking", async () => {
  const replies = [[{ type: 'call' as const, name: 'shell', input: { command: 'echo ran' } }], [{ type: 'text' as const, text: 'Done' }]]
  const sand = await boot(['bots'], [], [{ ...model, replies }])
  try {
    expect(sand.problems()).toEqual([])
    const bot = await sand.ask(botCreate, { name: 'Helper', models: { main: { model: 'fake/m' }, quick: {} } })
    await sand.ask(botSend, { bot: bot.id, prompt: 'run it', clientRequestId: 'run' })
    expect(await answer(sand, bot.id)).toBe('Done')
    const { entries } = await sand.ask(botOpen, { bot: bot.id })
    const results = entries.flatMap(entry => (entry.type === 'message' ? (entry.data as Message).content : [])).filter(block => block.type === 'tool_result')
    expect(results).toMatchObject([{ content: [{ type: 'text', text: expect.stringContaining('ran') }] }])
    expect(results[0]).not.toHaveProperty('isError')
  } finally {
    await sand.stop()
  }
}, 60_000)
