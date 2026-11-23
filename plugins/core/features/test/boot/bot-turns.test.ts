import { botCreate } from '@sand/bots/contract'
import type { Message } from '@sand/chats/contract'
import { modelSettings } from '@sand/model/contract'
import { tools } from '@sand/tools/contract'
import { expect, test } from 'bun:test'
import { boot, type Booted, model } from './boot'

const agentResults = async (sand: Booted, bot: string) => {
  const [child] = sand.sessions.children(bot)
  const agent = sand.sessions.require(child!.id)
  const [turn] = sand.turns.list(agent)
  await sand.turns.wait(turn!.id, 'end')
  return {
    model: sand.app.get(modelSettings)!.effective(agent).model,
    transcript: agent
      .path()
      .flatMap(entry => (entry.type === 'message' ? (entry.data as Message).content : []))
      .filter(block => block.type === 'tool_call' || block.type === 'tool_result' || (block.type === 'text' && block.typed === undefined)),
  }
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

test("with Threads and Bots on, a bot and its agent both get the shell, and the agent runs it without asking", async () => {
  const botReplies = [
    [{ type: 'call' as const, name: 'agent', input: { label: 'Run it', task: 'Run echo ran', does: 'build', background: true } }],
    [{ type: 'text' as const, text: 'Started' }],
    [{ type: 'text' as const, text: 'Done' }],
  ]
  const agentReplies = [[{ type: 'call' as const, name: 'shell', input: { command: 'echo ran' } }], [{ type: 'text' as const, text: 'Ran it' }]]
  const sand = await boot(['threads', 'bots'], [], [
    { ...model, id: 'aide', replies: agentReplies },
    { ...model, replies: botReplies },
  ], ['bot-gist'])
  try {
    expect(sand.problems()).toEqual([])
    const chat = await botChat(sand)
    expect(sand.app.get(tools)!.names(chat)).toContain('shell')
    await sand.turns.run(chat, 'run it')
    const { model: used, transcript } = await agentResults(sand, chat.id)
    expect({ used, transcript }).toMatchObject({
      used: 'aide/m',
      transcript: [
        { type: 'tool_call', name: 'shell' },
        { type: 'tool_result', content: [{ type: 'text', text: expect.stringContaining('ran') }] },
        { type: 'text', text: 'Ran it' },
      ],
    })
    expect(transcript[1]).not.toHaveProperty('isError')
  } finally {
    await sand.stop()
  }
})
