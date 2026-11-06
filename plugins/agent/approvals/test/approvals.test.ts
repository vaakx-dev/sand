import type { Entry, Message } from '@sand/chats/contract'
import { type Conversation, engine } from '@sand/engine/contract'
import { startSand } from '@sand/harness'
import { runtimeDrain } from '@sand/host-runtimes/contract'
import type { Source } from '@sand/replay/contract'
import { tools } from '@sand/tools/contract'
import { Database } from 'bun:sqlite'
import { afterEach, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { z } from 'zod'
import { approvals } from '../src/contract'
import { mailer, nextAsk, said, type Sand, shellReplies, start } from './fixture'

let running: Sand[] = []
let homes: string[] = []

afterEach(async () => {
  for (const sand of running) await sand.stop()
  for (const home of homes) rmSync(home, { recursive: true, force: true })
  running = []
  homes = []
})

const started = async (...args: Parameters<typeof start>) => {
  const sand = await start(...args)
  running.push(sand)
  return sand
}

const service = (sand: Sand) => sand.app.get(approvals)!

const resultOf = (messages: Message[], call: string) =>
  messages.flatMap(message => message.content).find(block => block.type === 'tool_result' && block.callId === call)

const mailBob: Source['replies'] = [[said('Mailing.'), { type: 'call', name: 'send_mail', input: { to: 'bob' } }], [said('Sent.')]]

test('a thread call that sends waits for the user, and allowing it once runs it and finishes the turn', async () => {
  const sand = await started(mailBob)
  const sent = mailer(sand)
  const chat = sand.chat('fake/m')
  const asked = nextAsk(sand)
  const done = sand.turns.run(chat, 'mail bob')
  const decision = await asked

  expect(decision).toMatchObject({
    owner: 'thread',
    conversation: chat.id,
    tool: 'send_mail',
    effect: 'send',
    summary: 'Mail bob',
    outcome: 'waiting',
  })
  expect(await sand.turns.wait(decision.turn, 'attention')).toMatchObject({ status: 'waiting', waiting: { kind: 'approval', durable: true } })
  expect(
    service(sand)
      .waiting()
      .map(found => found.id),
  ).toEqual([decision.id])
  expect(sent).toEqual([])

  expect(service(sand).answer(decision.id, 'once')).toMatchObject({ outcome: 'allowed', by: 'user' })
  expect(await done).toMatchObject({ stopReason: 'end_turn', text: 'Sent.' })
  expect(sent).toEqual(['bob'])
  expect(service(sand).waiting()).toEqual([])
  expect(service(sand).rules()).toEqual([])
})

test('always allow saves a rule that lets the next call through, and a denied call never runs', async () => {
  const sand = await started([
    [{ type: 'call', name: 'send_mail', input: { to: 'bob' } }],
    [{ type: 'call', name: 'send_mail', input: { to: 'amy' } }],
    [said('Both sent.')],
    [{ type: 'call', name: 'send_mail', input: { to: 'eve' } }],
    [said('Eve was not mailed.')],
  ])
  const sent = mailer(sand)
  const chat = sand.chat('fake/m')
  const asked = nextAsk(sand)
  const first = sand.turns.run(chat, 'mail bob and amy')
  service(sand).answer((await asked).id, 'always')
  await first

  expect(sent).toEqual(['bob', 'amy'])
  expect(service(sand).rules()).toMatchObject([{ owner: 'thread', conversation: chat.id, tool: 'send_mail', effect: 'send', verdict: 'allow' }])
  expect(
    service(sand)
      .decisions({ conversation: chat.id })
      .map(({ summary, outcome, by }) => ({ summary, outcome, by })),
  ).toEqual([
    { summary: 'Mail amy', outcome: 'allowed', by: 'rule' },
    { summary: 'Mail bob', outcome: 'allowed', by: 'user' },
  ])

  service(sand).removeRule(service(sand).rules()[0]!.id)
  const again = nextAsk(sand)
  const second = sand.turns.run(chat, 'mail eve')
  const decision = await again
  service(sand).answer(decision.id, 'deny')

  expect(await second).toMatchObject({ text: 'Eve was not mailed.' })
  expect(sent).toEqual(['bob', 'amy'])
  expect(resultOf(chat.messages(), decision.call)).toMatchObject({
    isError: true,
    content: [{ text: expect.stringContaining('the user denied this call') }],
  })
})

test('reads are free and still recorded, and stopping a waiting turn cancels its ask', async () => {
  const sand = await started([
    [
      { type: 'call', name: 'look', input: {} },
      { type: 'call', name: 'send_mail', input: { to: 'bob' } },
    ],
  ])
  mailer(sand)
  sand.app.get(tools)!.register({ name: 'look', description: 'look', effect: 'read', input: z.object({}), run: () => 'seen' })
  const chat = sand.chat('fake/m')
  const asked = nextAsk(sand)
  const done = sand.turns.run(chat, 'look, then mail')
  const decision = await asked
  sand.turns.interrupt(chat)

  expect(await done).toMatchObject({ stopReason: 'interrupted' })
  expect(service(sand).waiting()).toEqual([])
  expect(service(sand).decisions()).toMatchObject([
    { tool: 'send_mail', outcome: 'cancelled' },
    { tool: 'look', outcome: 'allowed', by: 'default' },
  ])
  expect(service(sand).decisions()[0]).toMatchObject({ id: decision.id, decided: expect.any(Number) })
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
      const written: Entry = {
        id: entry,
        session: id,
        parent: entries.at(-1)?.id ?? null,
        at,
        type,
        data,
        seq: entries.length + 1,
        ...(turn && { turn }),
      }
      entries.push(written)
      return written
    },
    path: () => [...entries],
    entries: () => [...entries],
    messages: () => entries.flatMap(entry => (entry.type === 'message' ? [entry.data as Message] : [])),
  }
}

test('a bot asks before it sends, like a thread, and denying it tells the model', async () => {
  const sand = await started([[{ type: 'call', name: 'send_mail', input: { to: 'bob' } }], [said('I left it.')]])
  const sent = mailer(sand)
  const memory = remember('grok', sand.home)
  const registry = sand.app.get(tools)!
  const runner = sand.app.get(engine)!.attach({
    owner: 'bot',
    open: id => (id === memory.id ? memory : undefined),
    select: () => ({ source: 'fake', model: 'fake/m', speed: 'normal' }),
    step: async conversation => {
      const messages = conversation.messages()
      return {
        request: { system: 'You are a bot.', messages, tools: registry.specs(messages, conversation), model: 'fake/m' },
        settle() {},
        lost: () => false,
      }
    },
  })
  const asked = nextAsk(sand)
  const done = runner.run(memory, 'mail bob')
  const decision = await asked

  expect(decision).toMatchObject({ owner: 'bot', conversation: 'grok', title: 'grok', tool: 'send_mail', effect: 'send', outcome: 'waiting' })
  expect(runner.get(decision.turn)).toMatchObject({ status: 'waiting', waiting: { kind: 'approval', call: decision.call } })
  service(sand).answer(decision.id, 'deny')

  expect(await done).toMatchObject({ text: 'I left it.' })
  expect(sent).toEqual([])
  expect(resultOf(memory.messages(), decision.call)).toMatchObject({ isError: true })
  runner.detach()
})

test('a turn waiting for approval when sand stops resumes after a restart, and the answer runs the call once', async () => {
  const home = mkdtempSync(join(tmpdir(), 'sand-approvals-'))
  homes.push(home)
  const child = Bun.spawn([Bun.argv[0]!, join(import.meta.dir, 'dying.ts'), home], { stdout: 'pipe' })
  const line = await new Response(child.stdout).body!.getReader().read()
  const died = JSON.parse(new TextDecoder().decode(line.value)) as { chat: string; turn: string; decision: string }
  child.kill()
  await child.exited
  const db = new Database(join(home, 'sand.db'))
  db.run('update turns set lease = 0 where ended is null')
  db.close()

  const sand = await started([[said('Done.')]], { home, plugins: ['agent/shell'] })
  const chat = sand.sessions.require(died.chat)

  expect(await sand.turns.wait(died.turn, 'attention')).toMatchObject({ status: 'waiting', waiting: { kind: 'approval' } })
  expect(
    service(sand)
      .waiting()
      .map(found => found.id),
  ).toEqual([died.decision])
  service(sand).answer(died.decision, 'once')

  expect(await sand.turns.wait(died.turn, 'end')).toMatchObject({ status: 'completed' })
  const [, call, result, reply] = chat.messages()
  expect(call).toEqual({
    role: 'assistant',
    content: [said('Checking.'), { type: 'tool_call', id: 'fake-1', name: 'shell', input: { command: 'echo approved' } }],
  })
  expect(result).toMatchObject({
    role: 'user',
    content: [{ type: 'tool_result', callId: 'fake-1', content: [{ text: expect.stringContaining('approved') }] }],
  })
  expect(reply).toEqual({ role: 'assistant', content: [said('Done.')] })
  expect(chat.messages()).toHaveLength(4)
}, 30_000)

test('a tool call from an app that runs its own model, like Claude Code or Codex, waits for approval the same way', async () => {
  const sand = await startSand([{ id: 'app', models: ['m'], replies: mailBob }], { plugins: ['agent/approvals'] })
  running.push(sand)
  const sent = mailer(sand)
  const chat = sand.chat('app/m')
  const asked = nextAsk(sand)
  const done = sand.turns.run(chat, 'mail bob')
  const decision = await asked

  expect(decision).toMatchObject({ owner: 'thread', tool: 'send_mail', effect: 'send', outcome: 'waiting' })
  expect(sent).toEqual([])
  service(sand).answer(decision.id, 'once')
  expect(await done).toMatchObject({ stopReason: 'end_turn', text: 'Sent.' })
  expect(sent).toEqual(['bob'])
})

test('draining hands a turn waiting for approval to the next runtime at once, without cancelling the ask', async () => {
  const home = mkdtempSync(join(tmpdir(), 'sand-approvals-'))
  homes.push(home)
  const first = await started(shellReplies, { home, plugins: ['agent/shell'] })
  service(first).setMode('careful')
  const chat = first.chat('fake/m')
  const asked = nextAsk(first)
  const sent = await first.turns.send(chat, { prompt: 'check', clientRequestId: 'a' })
  const decision = await asked
  if (sent.disposition !== 'started') throw new Error('The send should start a turn')

  first.app.emit(runtimeDrain)
  expect(first.turns.current(chat)).toBeUndefined()
  expect(first.turns.get(sent.turn)).toMatchObject({ status: 'waiting', waiting: { kind: 'approval', durable: true } })
  expect(first.turns.get(sent.turn)?.ended).toBeUndefined()
  await Bun.sleep(50)
  expect(service(first).decisions()).toMatchObject([{ id: decision.id, outcome: 'waiting' }])
  expect(chat.messages()).toHaveLength(2)

  const second = await started([[said('Done.')]], { home, plugins: ['agent/shell'] })
  expect(await second.turns.wait(sent.turn, 'attention')).toMatchObject({ status: 'waiting', waiting: { kind: 'approval' } })
  service(second).answer(decision.id, 'once')
  expect(await second.turns.wait(sent.turn, 'end')).toMatchObject({ status: 'completed' })
  const [, , result, reply] = second.sessions.require(chat.id).messages()
  expect(result).toMatchObject({ role: 'user', content: [{ type: 'tool_result', callId: 'fake-1', content: [{ text: expect.stringContaining('approved') }] }] })
  expect(reply).toEqual({ role: 'assistant', content: [said('Done.')] })
  expect(second.sessions.require(chat.id).messages()).toHaveLength(4)
}, 30_000)
