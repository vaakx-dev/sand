import { type Message, type Session, textOf } from '@sand/chats/contract'
import { startSand, type Sand } from '@sand/harness'
import { modelSettings } from '@sand/model/contract'
import { threadSend, threadUpdate } from '@sand/orchestrator/contract'
import type { Reply } from '@sand/replay/contract'
import { afterEach, expect, test } from 'bun:test'
import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

let sand: Sand

afterEach(() => sand.stop())

const said = (text: string): Reply => [{ type: 'text', text }]

const delegate = (input: Record<string, unknown> = {}): Reply => [{ type: 'call', name: 'agent', input: { label: 'Dig', task: 'Dig into it', model: 'child/m', ...input } }]

const start = async (parent: Reply[], child: Reply[], projects: { project: string; path: string }[] = [], plugins: string[] = []) => {
  sand = await startSand(
    [
      { id: 'parent', models: ['m'], replies: parent, api: 'anthropic' },
      { id: 'child', models: ['m'], replies: child, api: 'anthropic' },
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
  expect(sand.sessions.require(child.id).latest('agent')?.data).toEqual({ depth: 1 })
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

test("a subagent keeps working when its parent's turn is interrupted, and the user's own turns in it report back too", async () => {
  await start([delegate(), [{ type: 'hold' }], said('Noted.'), said('Noted again.')], [[{ type: 'hold' }], said('Answered you.')])
  const parent = sand.chat('parent/m')
  const turn = sand.turns.run(parent, 'Go')
  const child = await until(() => sand.sessions.children(parent.id).find(found => running(found.id)))
  await until(() => sand.requests('parent').length === 2)

  sand.turns.interrupt(parent)
  await turn
  expect(running(child.id)).toBeTruthy()

  sand.turns.interrupt(sand.sessions.require(child.id))
  await until(() => notices(parent).length === 1)
  await until(() => !running(parent.id))
  await sand.turns.run(sand.sessions.require(child.id), 'What did you find?', { origin: 'user' })
  const [, answered] = await until(() => notices(parent).length === 2 && notices(parent))
  expect(answered).toContain('Answered you.')
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
  expect(sand.sessions.require(child.id).latest('agent')?.data).toEqual({ name: 'scout', depth: 1, tools: ['read', 'grep'] })
  await until(() => sand.requests('child').length > 0)
  expect(bodies('child')[0]!.system[0]!.text).toContain('# Your role\n\nOnly look, never touch.')
})
