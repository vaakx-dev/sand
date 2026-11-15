import { botCreate } from '@sand/bots/contract'
import type { Message } from '@sand/chats/contract'
import { modelSettings } from '@sand/model/contract'
import { expect, test } from 'bun:test'
import { boot, type Booted, model } from './boot'

const botChat = async (sand: Booted) => {
  const bot = await sand.ask(botCreate, { name: 'Helper' })
  const chat = sand.sessions.require(bot.id)
  sand.app.get(modelSettings)!.change(chat, { model: 'fake/m' })
  return chat
}

test('with Threads and Bots on, a bot answers', async () => {
  const sand = await boot(['threads', 'bots'])
  try {
    expect(await sand.turns.run(await botChat(sand), 'hi')).toMatchObject({ text: 'Hello from the bot' })
  } finally {
    await sand.stop()
  }
})

test("with Threads and Bots on, a bot's shell call runs without asking", async () => {
  const replies = [[{ type: 'call' as const, name: 'shell', input: { command: 'echo ran' } }], [{ type: 'text' as const, text: 'Done' }]]
  const sand = await boot(['threads', 'bots'], [], [{ ...model, replies }])
  try {
    expect(sand.problems()).toEqual([])
    const chat = await botChat(sand)
    expect(await sand.turns.run(chat, 'run it')).toMatchObject({ text: 'Done' })
    const results = chat
      .path()
      .flatMap(entry => (entry.type === 'message' ? (entry.data as Message).content : []))
      .filter(block => block.type === 'tool_result')
    expect(results).toMatchObject([{ content: [{ type: 'text', text: expect.stringContaining('ran') }] }])
    expect(results[0]).not.toHaveProperty('isError')
  } finally {
    await sand.stop()
  }
})
