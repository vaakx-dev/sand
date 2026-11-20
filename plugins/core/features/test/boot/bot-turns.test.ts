import { botCreate } from '@sand/bots/contract'
import type { Message } from '@sand/chats/contract'
import { levelSet, modelSettings } from '@sand/model/contract'
import { tools } from '@sand/tools/contract'
import { expect, test } from 'bun:test'
import { boot, type Booted, model } from './boot'

const agentResults = async (sand: Booted, bot: string) => {
  for (let tries = 0; tries < 3000; tries++) {
    const [agent] = sand.sessions.children(bot)
    const results = (agent ? sand.sessions.require(agent.id).path() : [])
      .flatMap(entry => (entry.type === 'message' ? (entry.data as Message).content : []))
      .filter(block => block.type === 'tool_result')
    if (results.length) return results
    await Bun.sleep(10)
  }
  throw new Error("The bot's agent never got a tool result")
}

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

test("with Threads and Bots on, a bot's agent runs a shell call without asking and the bot can't", async () => {
  const botReplies = [
    [{ type: 'call' as const, name: 'agent', input: { label: 'Run it', task: 'Run echo ran', background: true } }],
    [{ type: 'text' as const, text: 'Started' }],
    [{ type: 'text' as const, text: 'Done' }],
  ]
  const agentReplies = [[{ type: 'call' as const, name: 'shell', input: { command: 'echo ran' } }], [{ type: 'text' as const, text: 'Ran it' }]]
  const sand = await boot(['threads', 'bots'], [], [
    { ...model, replies: botReplies },
    { ...model, id: 'kid', replies: agentReplies },
  ])
  try {
    expect(sand.problems()).toEqual([])
    await sand.ask(levelSet, { level: 'main', model: 'kid/m' })
    const chat = await botChat(sand)
    expect(sand.app.get(tools)!.names(chat)).not.toContain('shell')
    await sand.turns.run(chat, 'run it')
    const results = await agentResults(sand, chat.id)
    expect(results).toMatchObject([{ content: [{ type: 'text', text: expect.stringContaining('ran') }] }])
    expect(results[0]).not.toHaveProperty('isError')
  } finally {
    await sand.stop()
  }
})
