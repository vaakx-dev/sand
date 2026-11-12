import { type Message, textOf } from '@sand/chats/contract'
import { type SandOptions, startSand } from '@sand/harness'
import { answerEntry, type AskAnswer, loginAdd, loginsState, type Waiting } from '@sand/logins/contract'
import type { Reply } from '@sand/replay/contract'
import { afterEach, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { tools } from '../src/tools'

Bun.env.SAND_KEYCHAIN = 'off'

let home: string

afterEach(() => rmSync(home, { recursive: true, force: true }))

const tag = crypto.randomUUID().replaceAll('-', '').slice(0, 12)

const values = { key: `sk_${tag}_Deploy`, password: `Pw-${tag}-Shop`, token: `tok_${tag}_Answered` }

const plugins = ['connections/logins', 'agent/mcp-server', 'agent/logins-mcp']

const start = (replies: Reply[], options: SandOptions = {}) => startSand([{ id: 'fake', models: ['m'], replies, api: 'anthropic' }], { plugins, home, ...options })

const call = (name: string, input: Record<string, unknown> = {}): Reply => [{ type: 'call', name, input }]

const said = (text: string): Reply => [{ type: 'text', text }]

const tool = (name: string) => tools.find(found => found.name === name)!

const results = (entries: { type: string; data: unknown }[]) => {
  const blocks = entries.flatMap(entry => (entry.type === 'message' ? (entry.data as Message).content : []))
  const names = new Map(blocks.flatMap(block => (block.type === 'tool_call' ? [[block.id, block.name] as const] : [])))
  return Object.fromEntries(blocks.flatMap(block => (block.type === 'tool_result' ? [[names.get(block.callId) ?? '', textOf(block.content)] as const] : [])))
}

const leaked = (text: string) => [...Object.values(values), '[secret:'].filter(value => text.includes(value))

test('a thread adds a login, shares another with itself and lists its access through its tools, and no value comes back', async () => {
  home = mkdtempSync(join(tmpdir(), 'sand-logins-mcp-'))
  const first = await start([])
  const shop = await first.ask(loginAdd, { kind: 'website', name: 'Shop', site: 'shop.example', username: 'buyer', password: values.password })
  const chat = first.chat('fake/m').id
  await first.stop()

  const sand = await start([
    call('login_add', { kind: 'key', name: 'Deploy key', value: values.key }),
    call('login_change', { id: shop.id, threads: [chat] }),
    call('login_list'),
    said('Done.'),
  ])
  try {
    const thread = sand.sessions.require(chat)
    expect(await sand.turns.run(thread, 'Save the deploy key and use the shop login')).toMatchObject({ text: 'Done.' })

    const shown = results(thread.path())
    expect(Object.keys(shown).sort()).toEqual(['login_add', 'login_change', 'login_list'])
    expect(JSON.parse(shown.login_list!).logins).toMatchObject([
      { id: shop.id, name: 'Shop', threads: [chat], access: 'allowed' },
      { name: 'Deploy key', kind: 'key', threads: [chat], access: 'allowed' },
    ])
    expect(Object.values(shown).flatMap(leaked)).toEqual([])

    const outside = await sand.askAs({ device: 'outside', kind: 'agent' })(loginsState, {})
    expect(outside.logins.map(login => login.access)).toEqual([undefined, undefined])
    expect(leaked(JSON.stringify(outside))).toEqual([])
  } finally {
    await sand.stop()
  }
}, 30_000)

test('an outside agent finds a waiting secret request and answers it; the asking thread gets a login, never the value', async () => {
  home = mkdtempSync(join(tmpdir(), 'sand-logins-mcp-'))
  const sand = await start([call('request_secret', { title: 'Deploy token', reason: 'To deploy', once: false }), said('Saved.')])
  try {
    const thread = sand.chat('fake/m')
    const ran = sand.turns.run(thread, 'Deploy')
    const context = { call: sand.askAs({ device: 'outside', kind: 'agent' }) }
    let waiting: Waiting[] = []
    for (let tries = 0; tries < 500 && !waiting.length; tries++) {
      await Bun.sleep(10)
      waiting = (await tool('login_waiting').run({}, context)) as Waiting[]
    }
    expect(waiting).toMatchObject([{ session: thread.id, kind: 'secret', title: 'Deploy token' }])

    await tool('login_answer_secret').run({ session: thread.id, id: waiting[0]!.id, save: true, value: values.token }, context)
    expect(await ran).toMatchObject({ text: 'Saved.' })

    const answered = thread.path().find(entry => entry.type === answerEntry)?.data as AskAnswer
    expect(answered.status).toBe('saved')
    expect((await sand.ask(loginsState, {})).logins).toMatchObject([{ id: answered.login, name: 'Deploy token', threads: [thread.id] }])
    expect(leaked(JSON.stringify(results(thread.path())))).toEqual([])
  } finally {
    await sand.stop()
  }
}, 30_000)
