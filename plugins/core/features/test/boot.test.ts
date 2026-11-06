import { llm } from '@sand/accounts/contract'
import { approvals } from '@sand/approvals/contract'
import { botSend } from '@sand/bot-turns/contract'
import { botConversation, botCreate, botGet, bots } from '@sand/bots/contract'
import { calendars } from '@sand/calendar/contract'
import { type Message, sessions } from '@sand/chats/contract'
import { computers } from '@sand/computers/contract'
import { connections } from '@sand/connections/contract'
import { engine } from '@sand/engine/contract'
import { gitRepo } from '@sand/git/contract'
import { gitRunner } from '@sand/git-runner/contract'
import { startSand } from '@sand/harness'
import { htmlPages } from '@sand/html/contract'
import { schedules } from '@sand/schedules/contract'
import { tools } from '@sand/tools/contract'
import { expect, test } from 'bun:test'
import type { Service } from 'drydock'

const topLevel = ['threads', 'bots', 'calendar', 'computers', 'pcs', 'notifications', 'mcp-server', 'updates']

const model = { id: 'fake', models: ['m'], replies: [[{ type: 'text' as const, text: 'Hello from the bot' }]] }

const watched = { sessions, bots, calendars, computers, engine, llm, tools, approvals, schedules, connections, gitRepo, gitRunner, htmlPages }

type Name = keyof typeof watched

const boot = (on: string[], off: string[] = [], sources: Parameters<typeof startSand>[0] = on.some(id => ['threads', 'bots', 'computers'].includes(id)) ? [model] : []) => {
  const lines = [...new Set([...topLevel.filter(id => !on.includes(id)), ...off])].map(id => `${id} = false`)
  return startSand(sources, { config: `[features]\n${lines.join('\n')}` })
}

const running = (sand: Awaited<ReturnType<typeof boot>>) =>
  Object.entries(watched).flatMap(([name, token]) => (sand.app.get(token as Service<unknown>) ? [name as Name] : []))

const combinations: [string, string[], string[], Name[]][] = [
  ['the kernel alone', [], [], []],
  ['Threads alone', ['threads'], [], ['sessions', 'engine', 'llm', 'tools', 'approvals', 'gitRepo', 'gitRunner', 'htmlPages']],
  ['Threads without git', ['threads'], ['git'], ['sessions', 'engine', 'llm', 'tools', 'approvals', 'htmlPages']],
  ['Bots alone', ['bots'], [], ['bots', 'engine', 'llm', 'tools', 'approvals', 'schedules', 'htmlPages']],
  ['Bots without HTML pages', ['bots'], ['html'], ['bots', 'engine', 'llm', 'tools', 'approvals', 'schedules']],
  ['Bots without notifications, schedules or connections', ['bots'], ['notifications', 'schedules', 'connections'], ['bots', 'engine', 'llm', 'tools', 'approvals', 'htmlPages']],
  ['Bots without approvals', ['bots'], ['approvals'], ['bots', 'engine', 'llm', 'tools', 'schedules', 'htmlPages']],
  ['Calendar alone', ['calendar'], [], ['calendars', 'connections']],
  ['Computer use alone', ['computers'], [], ['computers', 'engine', 'llm', 'tools']],
  ['Several PCs & phone alone', ['pcs'], [], []],
  ['Notifications alone', ['notifications'], [], []],
  ['the MCP server alone', ['mcp-server'], [], []],
  ['Updates alone', ['updates'], [], []],
]

for (const [name, on, off, expected] of combinations)
  test(`${name}: every plugin that is on starts, and only what is needed runs`, async () => {
    const sand = await boot(on, off)
    try {
      expect(sand.problems()).toEqual([])
      expect(running(sand)).toEqual(expected)
    } finally {
      await sand.stop()
    }
  }, 60_000)

const answer = async (sand: Awaited<ReturnType<typeof boot>>, bot: string) => {
  for (let tries = 0; tries < 200; tries++) {
    const found = await sand.ask(botGet, { bot })
    if (found?.status === 'idle' && found.last?.role === 'assistant') return found.last.text
    await Bun.sleep(10)
  }
}

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

test("with Approvals off, a bot's shell call runs without asking", async () => {
  const replies = [[{ type: 'call' as const, name: 'shell', input: { command: 'echo ran' } }], [{ type: 'text' as const, text: 'Done' }]]
  const sand = await boot(['bots'], ['approvals'], [{ ...model, replies }])
  try {
    expect(sand.problems()).toEqual([])
    const bot = await sand.ask(botCreate, { name: 'Helper', models: { main: { model: 'fake/m' }, quick: {} } })
    await sand.ask(botSend, { bot: bot.id, prompt: 'run it', clientRequestId: 'run' })
    expect(await answer(sand, bot.id)).toBe('Done')
    const { entries } = await sand.ask(botConversation, { bot: bot.id })
    const results = entries.flatMap(entry => (entry.type === 'message' ? (entry.data as Message).content : [])).filter(block => block.type === 'tool_result')
    expect(results).toMatchObject([{ content: [{ type: 'text', text: expect.stringContaining('ran') }] }])
    expect(results[0]).not.toHaveProperty('isError')
  } finally {
    await sand.stop()
  }
}, 60_000)
