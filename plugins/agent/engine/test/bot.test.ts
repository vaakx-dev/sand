import type { Entry, Message } from '@sand/chats/contract'
import { type Conversation, type Conversations, engine } from '@sand/engine/contract'
import { startSand, type Sand } from '@sand/harness'
import type { Source } from '@sand/replay/contract'
import { tools } from '@sand/tools/contract'
import { Database } from 'bun:sqlite'
import { afterEach, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { z } from 'zod'

const said = (text: string) => ({ type: 'text', text }) as const

let running: Sand[] = []
let homes: string[] = []

afterEach(async () => {
  for (const sand of running) await sand.stop()
  for (const home of homes) rmSync(home, { recursive: true, force: true })
  running = []
  homes = []
})

interface Memory extends Conversation {
  messages(): Message[]
}

const remember = (id: string, cwd: string): Memory => {
  const entries: Entry[] = []
  return {
    id,
    owner: 'bot',
    cwd,
    append(type, data, { id: entry = Bun.randomUUIDv7(), at = Date.now(), turn } = {}) {
      const written: Entry = { id: entry, session: id, parent: entries.at(-1)?.id ?? null, at, type, data, seq: entries.length + 1, ...(turn && { turn }) }
      entries.push(written)
      return written
    },
    path: () => [...entries],
    entries: () => [...entries],
    messages: () => entries.flatMap(entry => (entry.type === 'message' ? [entry.data as Message] : [])),
  }
}

const start = async (replies: Source['replies'], { home, api }: { home?: string; api?: 'anthropic' } = {}) => {
  const sand = await startSand([{ id: 'fake', models: ['m'], replies, ...(api && { api }) }], home ? { home } : {})
  running.push(sand)
  return sand
}

const attachBots = (sand: Sand, memories: Map<string, Memory>, heard: string[] = []) => {
  const registry = sand.app.get(tools)!
  const bots: Conversations<Memory> = {
    owner: 'bot',
    open: id => memories.get(id),
    select: () => ({ source: 'fake', model: 'fake/m', speed: 'normal' }),
    async step(memory) {
      const messages = memory.messages()
      return { request: { system: 'You are a bot.', messages, tools: registry.specs(messages, memory), model: 'fake/m' }, settle() {}, lost: () => false }
    },
    started: (memory, prompt) => void heard.push(`started ${memory.id}: ${prompt.content.length}`),
    toolStarted: call => void heard.push(`tool ${call.name}`),
    ended: (memory, result) => void heard.push(`ended ${memory.id}: ${result.stopReason}`),
  }
  const runner = sand.app.get(engine)!.attach(bots)
  return runner
}

test('a bot conversation outside the chat store runs a turn with tools, and threads never see it', async () => {
  const sand = await start([[said('Checking.'), { type: 'call', name: 'where', input: {} }], [said('Done.')]], { api: 'anthropic' })
  const seen: Conversation[] = []
  sand.app.get(tools)!.register({
    name: 'where',
    description: 'where',
    input: z.object({}),
    run: (_input, { conversation }) => {
      seen.push(conversation)
      return `${conversation.owner} ${conversation.id}`
    },
  })
  sand.app.get(tools)!.register({ name: 'thread_thing', description: 'thread only', input: z.object({}), needs: ['thread'], run: () => 'no' })
  const memory = remember('grok', sand.home)
  const heard: string[] = []
  const runner = attachBots(sand, new Map([[memory.id, memory]]), heard)

  const result = await runner.run(memory, 'hello')

  expect(result).toMatchObject({ stopReason: 'end_turn', text: 'Done.' })
  expect(memory.messages()).toEqual([
    { role: 'user', content: [said('hello')] },
    { role: 'assistant', content: [said('Checking.'), { type: 'tool_call', id: 'fake-1', name: 'where', input: {} }] },
    { role: 'user', content: [{ type: 'tool_result', callId: 'fake-1', content: [said('bot grok')] }] },
    { role: 'assistant', content: [said('Done.')] },
  ])
  expect(seen).toEqual([memory])
  expect(heard).toEqual(['started grok: 1', 'tool where', 'ended grok: end_turn'])
  const offered = JSON.parse(sand.requests('fake')[0]!).tools.map((tool: { name: string }) => tool.name)
  expect(offered).toContain('where')
  expect(offered).not.toContain('thread_thing')
  const [turn] = runner.list(memory)
  expect(turn).toMatchObject({ owner: 'bot', conversation: 'grok', status: 'completed', ordinal: 1 })
  expect(sand.turns.get(turn!.id)).toBeUndefined()
  expect(sand.sessions.list()).toEqual([])
})

test('sends into a bot conversation start, steer and queue its turns, and a repeated request starts nothing new', async () => {
  const sand = await start([[said('First'), { type: 'call', name: 'gate', input: {} }], [said('Steered.')], [said('Queued.')]], { api: 'anthropic' })
  const gate = Promise.withResolvers<string>()
  const opened = Promise.withResolvers<void>()
  sand.tool('gate', () => {
    opened.resolve()
    return gate.promise
  })
  const memory = remember('grok', sand.home)
  const runner = attachBots(sand, new Map([[memory.id, memory]]))

  const first = await runner.send(memory, { prompt: 'go', clientRequestId: 'a' })
  expect(await runner.send(memory, { prompt: 'go', clientRequestId: 'a' })).toEqual(first)
  await opened.promise
  expect(await runner.send(memory, { prompt: 'and this', clientRequestId: 'b' })).toMatchObject({ disposition: 'steered' })
  expect(await runner.send(memory, { prompt: 'then that', mode: 'queue', clientRequestId: 'c' })).toMatchObject({ disposition: 'queued' })
  const waiting = runner.pending(memory)
  expect(waiting.map(item => item.kind)).toEqual(['steer', 'queue'])
  await Bun.sleep(20)
  gate.resolve('open')

  if (first.disposition !== 'started') throw new Error('The first send should start a turn')
  await runner.wait(first.turn, 'end')
  const next = await new Promise<string>(resolve => {
    const check = () => {
      const latest = runner.list(memory)[0]
      if (latest && latest.id !== first.turn && latest.ended) resolve(latest.id)
      else setTimeout(check, 20)
    }
    check()
  })
  expect(runner.get(next)).toMatchObject({ ordinal: 2, status: 'completed' })
  expect(memory.messages().filter(message => message.role === 'user').map(message => message.content[0])).toEqual([
    said('go'),
    { type: 'tool_result', callId: 'fake-1', content: [said('open')] },
    said('and this'),
    said('then that'),
  ])
  const sentAt = (text: string) => memory.path().find(entry => entry.type === 'message' && Bun.deepEquals((entry.data as Message).content, [said(text)]))?.at
  expect([sentAt('and this'), sentAt('then that')]).toEqual(waiting.map(item => item.at))
  expect(runner.pending(memory)).toEqual([])
})

test('a bot turn whose process stopped mid-reply carries on when bots attach again, and the same request again gets that turn', async () => {
  const home = mkdtempSync(join(tmpdir(), 'sand-engine-'))
  homes.push(home)
  const memory = remember('grok', home)
  const memories = new Map([[memory.id, memory]])
  const first = await start([[said('Half a thought'), { type: 'hold' }]], { home })
  const spoke = Promise.withResolvers<void>()
  const runner = first.app.get(engine)!.attach({
    owner: 'bot',
    open: id => memories.get(id),
    select: () => ({ source: 'fake', model: 'fake/m', speed: 'normal' }),
    step: async conversation => ({ request: { system: '', messages: conversation.messages(), tools: [], model: 'fake/m' }, settle() {}, lost: () => false }),
    streamed: event => void (event.type === 'text' && spoke.resolve()),
  })
  const sent = await runner.send(memory, { prompt: 'think', clientRequestId: 'a' })
  if (sent.disposition !== 'started') throw new Error('The send should start a turn')
  await spoke.promise
  const db = new Database(join(home, 'sand.db'))
  db.run('update turns set lease = 0 where ended is null')
  db.close()

  const second = await start([[said('Whole thought.')]], { home })
  const again = attachBots(second, memories)

  expect(await again.send(memory, { prompt: 'think', clientRequestId: 'a' })).toEqual(sent)
  expect(await again.wait(sent.turn, 'end')).toMatchObject({ owner: 'bot', status: 'completed' })
  expect(memory.messages()).toEqual([
    { role: 'user', content: [said('think')] },
    { role: 'assistant', content: [said('Whole thought.')] },
  ])
  expect(again.list(memory)).toHaveLength(1)
})

test('an empty reply gets one nudge, then the turn ends', async () => {
  const sand = await start([[{ type: 'thinking', text: 'hmm' }], [{ type: 'thinking', text: 'still hmm' }]], { api: 'anthropic' })
  const memory = remember('grok', sand.home)
  const runner = attachBots(sand, new Map([[memory.id, memory]]))

  const result = await runner.run(memory, 'hello')

  expect(result).toMatchObject({ stopReason: 'end_turn', text: '', steps: 2 })
  const nudges = memory.messages().filter(message => message.role === 'user' && JSON.stringify(message).includes('empty'))
  expect(nudges).toHaveLength(1)
  expect(sand.requests('fake')).toHaveLength(2)
})
