import { botChangeWire, botCreate, botList } from '@sand/bots/contract'
import { type Message, type Session, textOf } from '@sand/chats/contract'
import { pairPcs, startSand, type Sand } from '@sand/harness'
import { modelSettings } from '@sand/model/contract'
import { threadList, threadRemove, threadSend, threadStop, threadUpdate, waitThread } from '@sand/orchestrator/contract'
import type { Reply } from '@sand/replay/contract'
import { tools } from '@sand/tools/contract'
import { afterEach, expect, test } from 'bun:test'
import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod'

let sand: Sand
let box: Sand | undefined

afterEach(async () => {
  await Promise.all([sand.stop(), box?.stop()])
  box = undefined
})

const said = (text: string): Reply => [{ type: 'text', text }]

const asked = (input: Record<string, unknown> = {}) => ({ type: 'call' as const, name: 'agent', input: { label: 'Dig', task: 'Dig into it', does: 'build', ...input } })

const ask = (input: Record<string, unknown> = {}): Reply => [asked(input)]

const delegate = (input: Record<string, unknown> = {}): Reply => ask({ background: true, ...input })

const start = async (parent: Reply[], child: Reply[], projects: { project: string; path: string }[] = [], plugins: string[] = []) => {
  sand = await startSand(
    [
      { id: 'child', models: ['m'], replies: child, api: 'anthropic' },
      { id: 'parent', models: ['m'], replies: parent, api: 'anthropic' },
    ],
    { plugins: ['core/watch', 'agent/subagents', ...plugins], projects },
  )
}

const git = (cwd: string, ...args: string[]) => {
  const result = Bun.spawnSync(['git', ...args], { cwd, env: { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' } })
  if (result.exitCode !== 0) throw new Error(result.stderr.toString())
  return result.stdout.toString().trim()
}

const until = async <T>(find: () => T | undefined | false, most = 300) => {
  for (let tries = 0; tries < most; tries++) {
    const found = find()
    if (found) return found
    await Bun.sleep(10)
  }
  throw new Error('It never happened')
}

const prompts = (session: Session) =>
  session.path().flatMap(entry => (entry.type === 'message' && (entry.data as Message).role === 'user' ? [textOf((entry.data as Message).content)].filter(Boolean) : []))

const results = (session: Session) =>
  session.path().flatMap(entry => (entry.type === 'message' ? (entry.data as Message).content.flatMap(block => (block.type === 'tool_result' ? [textOf(block.content)] : [])) : []))

const running = (id: string) => sand.turns.current(sand.sessions.require(id))

type Body = { system: { text: string }[]; tools: { name: string; description: string }[] }

const bodies = (source: string) => sand.requests(source).map(body => JSON.parse(body) as Body)

const notices = (session: Session) => prompts(session).filter(text => text.startsWith('<task-notification>'))

const childOf = (parent: Session) => until(() => sand.sessions.children(parent.id)[0])

test('a subagent is its own chat in the parent folder; its replies come back as thread notices, including ones to a follow-up', async () => {
  await start([delegate(), said('Started it.'), said('Got it.'), said('Got more.')], [said('Found it.'), said('Found more.')])
  const parent = sand.chat('parent/m')
  await sand.turns.run(parent, 'Go')

  const child = await childOf(parent)
  expect(child).toMatchObject({ kind: 'agent', title: 'Dig', cwd: parent.cwd, parent: parent.id, origin: expect.any(String) })
  expect(sand.sessions.require(child.id).latest('agent')?.data).toEqual({ depth: 1, role: 'builder' })
  expect(results(parent)[0]).toStartWith(`Started subagent ${child.id}.`)
  const [notice] = await until(() => notices(parent).length === 1 && notices(parent))
  expect(notice).toContain(`<thread>${child.id}</thread>`)
  expect(notice).toContain('<status>done</status>')
  expect(notice).toContain('Found it.')

  await until(() => !running(parent.id))
  await sand.askAs({ device: 'sand', kind: 'agent', actor: { owner: 'thread', id: parent.id } })(threadSend, { session: child.id, prompt: 'Dig deeper', origin: 'mcp', clientRequestId: 'more' })
  const [, followed] = await until(() => notices(parent).length === 2 && notices(parent))
  expect(followed).toContain('Found more.')
  expect(sand.sessions.children(parent.id)).toHaveLength(1)
})

test("a subagent's answer is the result of the call that asked it, with no notice after, and it hears what the caller is working on", async () => {
  await start([ask(), said('Fixed.')], [said('Found it.')])
  const parent = sand.chat('parent/m')
  await sand.turns.run(parent, 'Fix the login bug')

  const child = await childOf(parent)
  expect(results(parent)).toEqual([`Found it.\n\n(Subagent ${child.id}; thread_send asks it more.)`])
  const [task] = prompts(sand.sessions.require(child.id))
  expect(task).toContain('Dig into it\n\n<background>\nThe agent asking is working on this request:\nFix the login bug\n</background>')
  await Bun.sleep(200)
  expect(notices(parent)).toEqual([])
  expect(sand.turns.list(parent)).toHaveLength(1)
})

test('a thread waiting on a subagent stops waiting when a message comes in, and hears the answer later as a notice', async () => {
  await start([ask(), said('Still on it.'), said('Heard you.'), said('Got the answer.')], [[{ type: 'wait', ms: 1500 }, { type: 'text', text: 'Found it.' }]])
  const chat = sand.chat('parent/m')
  const turn = sand.turns.run(chat, 'Go')
  const child = await childOf(chat)
  await until(() => running(child.id))

  await sand.turns.send(chat, { prompt: 'Are you there?', origin: 'user', clientRequestId: 'ping' })
  await turn
  expect(running(child.id)).toBeTruthy()
  expect(results(chat)[0]).toStartWith(`A new message came in, so this call stopped waiting. Subagent ${child.id} keeps working`)
  await until(() => prompts(chat).includes('Are you there?'))
  const [notice] = await until(() => notices(chat).length === 1 && notices(chat), 1000)
  expect(notice).toContain('Found it.')
})

test('a bot never waits on a subagent, and its subagent runs on the main level whatever model or level it asked for', async () => {
  await start([ask({ level: 'light', model: 'parent/m' }), said('On it.'), said('Heard.')], [[{ type: 'wait', ms: 1500 }, { type: 'text', text: 'Found it.' }]], [], ['bots/bots', 'bots/turns'])
  await sand.ask(levelSet, { level: 'main', model: 'child/m' })
  const chat = sand.sessions.require((await sand.ask(botCreate, { name: 'Scout' })).id)
  sand.app.get(modelSettings)!.change(chat, { model: 'parent/m' })

  await sand.turns.run(chat, 'Go')
  const child = await childOf(chat)

  expect(running(child.id)).toBeTruthy()
  expect(results(chat)[0]).toStartWith(`Started subagent ${child.id}.`)
  expect(sand.app.get(modelSettings)?.effective(sand.sessions.require(child.id)).model).toBe('child/m')
  const [notice] = await until(() => notices(chat).length === 1 && notices(chat), 1000)
  expect(notice).toContain('Found it.')
})

test('subagents asked in one step all answer in that step', async () => {
  await start([[asked({ label: 'One' }), asked({ label: 'Two' })], said('Both in.')], [said('Answer A.'), said('Answer B.')])
  const parent = sand.chat('parent/m')
  await sand.turns.run(parent, 'Go')

  expect(sand.sessions.children(parent.id)).toHaveLength(2)
  expect(sand.requests('parent')).toHaveLength(2)
  const answers = results(parent).map(text => text.split('\n')[0])
  expect(answers.toSorted()).toEqual(['Answer A.', 'Answer B.'])
  await Bun.sleep(200)
  expect(notices(parent)).toEqual([])
})

test('stopping an agent stops the subagents it started, all the way down, without waking it again', async () => {
  sand = await startSand(
    [
      { id: 'child', models: ['m'], replies: [delegate({ agent: 'grand' }), [{ type: 'hold' }]], api: 'anthropic' },
      { id: 'grand', models: ['m'], replies: [[{ type: 'hold' }]], api: 'anthropic' },
      { id: 'parent', models: ['m'], replies: [delegate(), [{ type: 'hold' }]], api: 'anthropic' },
    ],
    { plugins: ['core/watch', 'agent/subagents'] },
  )
  await Bun.write(join(sand.home, 'agents', 'grand.md'), '---\ndescription: Goes deeper.\nmodel: grand/m\n---\nGo deeper.')
  const parent = sand.chat('parent/m')
  const turn = sand.turns.run(parent, 'Go')
  const child = await childOf(parent)
  const grandchild = await childOf(sand.sessions.require(child.id))
  await until(() => running(grandchild.id) && sand.requests('child').length === 2 && sand.requests('parent').length === 2)

  await sand.ask(threadStop, { session: parent.id })
  await turn

  await until(() => !running(child.id) && !running(grandchild.id))
  await Bun.sleep(200)
  expect(running(parent.id)).toBeFalsy()
  expect(sand.turns.list(parent)).toHaveLength(1)
})

const startPaired = async (parent: (boxHome: string) => Reply[], child: Reply[], plugins: string[] = []) => {
  box = await startSand([{ id: 'child', models: ['m'], replies: child, api: 'anthropic' }], { plugins: ['core/watch', 'agent/subagents'] })
  await start(parent(box.home), [], [], plugins)
  return { box, link: pairPcs(sand, box).toBox }
}

const onBox = (pc: Sand, parent: Session) => until(() => pc.sessions.children(parent.id)[0])

const actingAs = (parent: Session) => sand.askAs({ device: 'sand', kind: 'agent', actor: { owner: 'thread', id: parent.id } })

const sentFrom = (session: Session) => {
  const message = session.latest('message')?.data as Message
  return message.content.flatMap(block => (block.type === 'context' ? block.records.map(record => record.data.id) : []))
}

test('a subagent on another PC answers in the call that asked it', async () => {
  const { box: there } = await startPaired(home => [ask({ pc: 'box', folder: home }), said('Got it.')], [said('Found it.')])
  const parent = sand.chat('parent/m')
  await sand.turns.run(parent, 'Go')

  const child = await onBox(there, parent)
  expect(results(parent)).toEqual([`Found it.\n\n(Subagent ${child.id}; thread_send asks it more.)`])
  await Bun.sleep(200)
  expect(notices(parent)).toEqual([])
})

test('a subagent can run in a folder on another PC, and its reply comes back as a notice', async () => {
  const { box: there } = await startPaired(home => [delegate({ pc: 'box', folder: home }), said('Started it.'), said('Got it.')], [said('Found it.')])
  const parent = sand.chat('parent/m')
  await sand.turns.run(parent, 'Go')

  const child = await onBox(there, parent)
  expect(child).toMatchObject({ kind: 'agent', cwd: there.home, parent: parent.id })
  expect(there.sessions.require(child.id).latest('agent')?.data).toEqual({ depth: 1, role: 'builder' })
  expect(sand.sessions.open(child.id)).toBeUndefined()
  const [notice] = await until(() => notices(parent).length === 1 && notices(parent))
  expect(notice).toContain(`<thread>${child.id}</thread>`)
  expect(notice).toContain('Found it.')
})

test('a bot shows its subagent on another PC working, live, through a blip, until that subagent stops', async () => {
  const { box: there, link } = await startPaired(home => [delegate({ pc: 'box', folder: home }), said('Started it.'), said('Noted.')], [[{ type: 'hold' }]], ['bots/bots', 'bots/turns'])
  const bot = await sand.ask(botCreate, { name: 'Scout' })
  const chat = sand.sessions.require(bot.id)
  sand.app.get(modelSettings)!.change(chat, { model: 'parent/m' })
  let shown = 0
  sand.hear(botChangeWire, summary => void (summary.id === bot.id && (shown = summary.subagents.length)))
  const listed = async () => (await sand.ask(botList, {})).find(found => found.id === bot.id)?.subagents.length

  await sand.turns.run(chat, 'Go')
  const child = await onBox(there, chat)
  await until(() => shown === 1)
  expect(await listed()).toBe(1)

  link.drop()
  await there.ask(threadStop, { session: child.id })
  await until(() => !there.turns.current(there.sessions.require(child.id)))
  expect(await listed()).toBe(1)

  link.open()
  await until(() => shown === 0)
  expect(await listed()).toBe(0)
})

test('stopping an agent stops its subagent on another PC without waking it again', async () => {
  const { box: there } = await startPaired(home => [delegate({ pc: 'box', folder: home }), [{ type: 'hold' }]], [[{ type: 'hold' }]])
  const parent = sand.chat('parent/m')
  const turn = sand.turns.run(parent, 'Go')
  const child = await onBox(there, parent)
  const busy = () => there.turns.current(there.sessions.require(child.id))
  await until(() => busy() && sand.requests('parent').length === 2)

  await sand.ask(threadStop, { session: parent.id })
  await turn

  await until(() => !busy())
  await until(() => notices(parent).length === 1)
  expect(running(parent.id)).toBeFalsy()
  expect(sand.turns.list(parent)).toHaveLength(1)
})

test('an agent lists, messages, stops and waits for its subagent on another PC as it would one beside it', async () => {
  const digging: Reply = [{ type: 'text', text: 'Digging.' }, { type: 'hold' }]
  const { box: there } = await startPaired(
    home => [delegate({ pc: 'box', folder: home }), said('Started it.'), said('Got it.'), said('Noted.')],
    [said('Found it.'), digging, said('Found more.')],
  )
  const parent = sand.chat('parent/m')
  await sand.turns.run(parent, 'Go')
  const child = await onBox(there, parent)
  await until(() => notices(parent).length === 1)
  const asParent = actingAs(parent)

  expect((await asParent(threadList, { mine: true })).map(row => [row.thread, row.pc])).toEqual([[child.id, 'box']])

  const session = there.sessions.require(child.id)
  await asParent(threadSend, { session: child.id, prompt: 'Dig deeper', origin: 'mcp', clientRequestId: 'deeper' })
  await until(() => there.turns.current(session))
  expect(sentFrom(session)).toEqual([parent.id])

  expect(await asParent(threadStop, { session: child.id })).toBe(true)
  await until(() => !there.turns.current(session))

  await asParent(threadSend, { session: child.id, prompt: 'Once more', origin: 'mcp', clientRequestId: 'more' })
  expect(await waitThread(asParent, child.id, 'attention')).toMatchObject({ status: 'completed', reply: 'Found more.' })
})

test("a subagent's report reaches its parent once the parent's PC can reach the other PC again", async () => {
  const { box: there, link } = await startPaired(home => [delegate({ pc: 'box', folder: home }), said('Started it.'), said('Got it.')], [[{ type: 'hold' }]])
  const parent = sand.chat('parent/m')
  await sand.turns.run(parent, 'Go')
  const child = await onBox(there, parent)
  await until(() => there.turns.current(there.sessions.require(child.id)))

  link.drop()
  await there.ask(threadStop, { session: child.id })
  await Bun.sleep(100)
  expect(notices(parent)).toEqual([])

  link.open()
  const [notice] = await until(() => notices(parent).length === 1 && notices(parent))
  expect(notice).toContain(`<thread>${child.id}</thread>`)
})

test('archiving an agent archives its subagent on another PC, once that PC can be reached again', async () => {
  const { box: there, link } = await startPaired(home => [delegate({ pc: 'box', folder: home }), said('Started it.')], [[{ type: 'hold' }]])
  const parent = sand.chat('parent/m')
  await sand.turns.run(parent, 'Go')
  const child = await onBox(there, parent)
  const session = there.sessions.require(child.id)
  await until(() => there.turns.current(session))

  link.drop()
  await sand.ask(threadUpdate, { session: parent.id, archived: true })
  await Bun.sleep(100)
  expect(session.archived).toBeNull()

  link.open()
  await until(() => session.archived !== null)
  expect(there.turns.current(session)).toBeUndefined()
})

test('a subagent can work in a project of its own, and is archived with its parent', async () => {
  const folder = join(process.env.TEMP ?? '/tmp', `sand-project-${Bun.randomUUIDv7()}`)
  mkdirSync(folder, { recursive: true })
  await start([delegate({ project: 'site' }), said('Started.')], [[{ type: 'hold' }]], [{ project: 'site', path: folder }])
  const parent = sand.chat('parent/m')
  await sand.turns.run(parent, 'Go')

  const child = await childOf(parent)
  expect(child).toMatchObject({ cwd: folder, project: 'site' })
  await until(() => running(child.id))

  await sand.ask(threadUpdate, { session: parent.id, archived: true })
  await until(() => sand.sessions.require(child.id).archived !== null)
  expect(running(child.id)).toBeFalsy()
})

test('a subagent given a worktree works in its own checkout, which goes once its parent is archived', async () => {
  await start([delegate({ worktree: true }), said('Started.'), said('Noted.')], [said('Done.')], [], ['git/runner', 'git/git', 'git/worktrees'])
  const repo = join(sand.home, 'repo')
  await Bun.write(join(repo, 'tracked.txt'), 'first\n')
  git(repo, 'init', '-q', '-b', 'main')
  git(repo, 'add', '.')
  git(repo, 'commit', '-q', '-m', 'first')
  const parent = sand.sessions.thread(repo)
  sand.app.get(modelSettings)!.change(parent, { model: 'parent/m' })
  await sand.turns.run(parent, 'Go')

  const child = await childOf(parent)
  expect(child.kind).toBe('agent')
  expect(child.cwd.startsWith(join(sand.home, 'worktrees'))).toBe(true)
  await until(() => notices(parent).length === 1)
  await until(() => !running(parent.id))

  await sand.ask(threadUpdate, { session: parent.id, archived: true })
  await until(() => !existsSync(child.cwd) && git(repo, 'branch', '--list', 'sand/*') === '', 2000)
})

test('only agents defined in the home folder can be named, and they run with their role and tools', async () => {
  await start([delegate({ agent: 'nobody' }), said('No such agent.'), delegate({ agent: 'scout' }), said('Started.'), said('Noted.')], [said('Scouted.')])
  await Bun.write(join(sand.home, 'agents', 'scout.md'), '---\ndescription: Looks around.\ntools: read, grep\n---\nOnly look, never touch.')
  const parent = sand.chat('parent/m')

  await sand.turns.run(parent, 'Ask nobody')
  expect(results(parent)[0]).toEndWith('Unknown agent "nobody". Available: scout')
  expect(bodies('parent')[0]!.tools.find(tool => tool.name === 'agent')!.description).toContain('Agents you can name:\n- scout: Looks around.')

  await sand.turns.run(parent, 'Scout')
  const child = await childOf(parent)
  expect(sand.sessions.require(child.id).latest('agent')?.data).toEqual({ name: 'scout', depth: 1, role: 'builder', tools: ['read', 'grep'] })
  await until(() => sand.requests('child').length > 0)
  expect(bodies('child')[0]!.system[0]!.text).toContain('# Your role\n\nOnly look, never touch.')
})

test("a subagent's prompt opens with its own intro in place of the thread's and keeps the shared rules", async () => {
  await start([delegate(), said('Started.'), said('Noted.')], [said('Done.')], [], ['agent/vstack'])
  await sand.turns.run(sand.chat('parent/m'), 'Go')

  await until(() => sand.requests('child').length > 0)
  const system = bodies('child')[0]!.system[0]!.text
  expect(system).toStartWith('You are a sand subagent')
  expect(system).not.toContain('You are sand, an agent')
  expect(system).toContain('## Be straight with the user')
})

test('a subagent that only finds things runs as a finder and is told to report rather than guess', async () => {
  await start([delegate({ does: 'find' }), said('Started.'), said('Noted.')], [said('Found nothing.')])
  const parent = sand.chat('parent/m')

  await sand.turns.run(parent, 'Look it up')
  const child = await childOf(parent)

  expect(sand.sessions.require(child.id).latest('agent')?.data).toEqual({ depth: 1, role: 'finder' })
  expect(sand.app.get(modelSettings)?.effective(sand.sessions.require(child.id)).model).toBe('child/m')
  await until(() => sand.requests('child').length > 0)
  expect(bodies('child')[0]!.system[0]!.text).toContain("say so rather than guessing")
})

const probeCalls = (): Reply => [
  { type: 'call', name: 'probe_read', input: {} },
  { type: 'call', name: 'probe_write', input: {} },
  { type: 'call', name: 'probe_mixed', input: { changes: false } },
  { type: 'call', name: 'probe_mixed', input: { changes: true } },
]

const probesFor = async (does: 'find' | 'build') => {
  const touched: string[] = []
  await start([delegate({ does }), said('Started.'), said('Noted.')], [probeCalls(), said('Done.')])
  const register = sand.app.get(tools)!.register
  register({ name: 'probe_read', description: 'reads', input: z.object({}), effect: 'read', run: () => (touched.push('read'), 'read done') })
  register({ name: 'probe_write', description: 'writes', input: z.object({}), effect: 'write', run: () => (touched.push('write'), 'write done') })
  register({
    name: 'probe_mixed',
    description: 'reads or writes',
    input: z.object({ changes: z.boolean() }),
    act: ({ changes }) => ({ effect: changes ? 'write' : 'read' }),
    run: ({ changes }) => (touched.push(changes ? 'mixed write' : 'mixed read'), 'mixed done'),
  })
  const parent = sand.chat('parent/m')
  await sand.turns.run(parent, 'Look it up')
  const child = sand.sessions.require((await childOf(parent)).id)
  await until(() => results(child).length === 4)
  return { touched, results: results(child), offered: bodies('child')[0]!.tools.map(tool => tool.name) }
}

test('a finder is offered only tools that read and cannot make a call that changes things', async () => {
  const { touched, results, offered } = await probesFor('find')
  expect(offered).toContain('probe_read')
  expect(offered).toContain('probe_mixed')
  expect(offered).not.toContain('probe_write')
  expect(results).toEqual(['read done', 'Unknown tool: probe_write', 'mixed done', expect.stringContaining('probe_mixed isn\'t available to this agent for this call')])
  expect(touched).toEqual(['read', 'mixed read'])
})

test('a builder can use tools that change things', async () => {
  const { touched, results } = await probesFor('build')
  expect(results).toEqual(['read done', 'write done', 'mixed done', 'mixed done'])
  expect(touched).toEqual(['read', 'write', 'mixed read', 'mixed write'])
})

test('deleting an agent deletes its subagent on another PC, once that PC can be reached again, and no other PC may', async () => {
  const { box: there, link } = await startPaired(home => [delegate({ pc: 'box', folder: home }), said('Started it.')], [[{ type: 'hold' }]])
  const parent = sand.chat('parent/m')
  await sand.turns.run(parent, 'Go')
  const child = await onBox(there, parent)
  await until(() => there.turns.current(there.sessions.require(child.id)))

  await expect(there.askAs({ device: 'stranger', kind: 'pc' })(threadRemove, { session: child.id })).rejects.toThrow('denied')

  link.drop()
  await sand.sessions.remove(parent.id)
  await Bun.sleep(100)
  expect(there.sessions.open(child.id)).toBeDefined()

  link.open()
  await until(() => !there.sessions.open(child.id))
})
