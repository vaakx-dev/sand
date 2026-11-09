import { type Message, type Session, textOf } from '@sand/chats/contract'
import { startSand, type Sand } from '@sand/harness'
import type { Reply } from '@sand/replay/contract'
import { afterEach, expect, test } from 'bun:test'
import { join } from 'node:path'

let sand: Sand

afterEach(() => sand.stop())

const said = (text: string): Reply => [{ type: 'text', text }]

const delegate = (input: Record<string, unknown> = {}): Reply => [{ type: 'call', name: 'agent', input: { label: 'Dig', task: 'Dig into it', model: 'child/m', ...input } }]

const start = async (parent: Reply[], child: Reply[], maxAgents?: number) => {
  sand = await startSand(
    [
      { id: 'parent', models: ['m'], replies: parent, api: 'anthropic' },
      { id: 'child', models: ['m'], replies: child, api: 'anthropic' },
    ],
    { plugins: ['core/watch', 'agent/subagents', 'agent/mcp-server', 'agent/threads-mcp'], ...(maxAgents && { options: { subagents: { max_agents: maxAgents } } }) },
  )
}

const until = async <T>(find: () => T | undefined | false) => {
  for (let tries = 0; tries < 300; tries++) {
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

test('an agent works in a thread of its own and reports back to its parent as a task notification', async () => {
  await start([delegate(), said('Started it.'), said('Got it.')], [said('Found it.')])
  const parent = sand.chat('parent/m')
  await sand.turns.run(parent, 'Go')

  const [child] = sand.sessions.children(parent.id)
  expect(child).toMatchObject({ kind: 'agent', title: 'Dig', origin: expect.any(String) })
  expect(sand.sessions.require(child!.id).latest('agent')?.data).toEqual({ depth: 1 })
  expect(results(parent)[0]).toStartWith(`Started agent thread ${child!.id}.`)
  const notice = await until(() => prompts(parent).find(text => text.startsWith('<task-notification>')))
  expect(notice).toContain(`<thread>${child!.id}</thread>`)
  expect(notice).toContain('<status>done</status>')
  expect(notice).toContain('Found it.')
})

test('interrupting the parent stops its running agents, which then send no notification', async () => {
  await start([delegate(), [{ type: 'hold' }]], [[{ type: 'hold' }]])
  const parent = sand.chat('parent/m')
  const turn = sand.turns.run(parent, 'Go')
  const child = await until(() => sand.sessions.children(parent.id).find(found => running(found.id)))
  await until(() => sand.requests('parent').length === 2)

  sand.turns.interrupt(parent)
  await turn
  await until(() => !running(child.id))
  await Bun.sleep(100)
  expect(prompts(parent)).toEqual(['Go'])
})

test('only agents defined in the home folder can be named, and they run with their role and tools', async () => {
  await start([delegate({ agent: 'nobody' }), said('No such agent.'), delegate({ agent: 'scout' }), said('Started.'), said('Noted.')], [said('Scouted.')])
  await Bun.write(join(sand.home, 'agents', 'scout.md'), '---\ndescription: Looks around.\ntools: read, grep\n---\nOnly look, never touch.')
  const parent = sand.chat('parent/m')

  await sand.turns.run(parent, 'Ask nobody')
  expect(results(parent)[0]).toEndWith('Unknown agent "nobody". Available: scout')
  expect(bodies('parent')[0]!.tools.find(tool => tool.name === 'agent')!.description).toContain('Agents you can name:\n- scout: Looks around.')

  await sand.turns.run(parent, 'Scout')
  const [child] = sand.sessions.children(parent.id)
  expect(sand.sessions.require(child!.id).latest('agent')?.data).toEqual({ name: 'scout', depth: 1, tools: ['read', 'grep'] })
  await until(() => sand.requests('child').length > 0)
  expect(bodies('child')[0]!.system[0]!.text).toContain('# Your role\n\nOnly look, never touch.')
})

test('agents past the cap wait for a running one to finish before they start working', async () => {
  await start([[...delegate({ label: 'One' }), ...delegate({ label: 'Two' })], said('Started both.'), said('Noted.'), said('Noted.')], [[{ type: 'hold' }], said('Second done.')], 1)
  const parent = sand.chat('parent/m')
  await sand.turns.run(parent, 'Go')
  const [first] = sand.sessions.children(parent.id)
  await until(() => sand.requests('child').length === 1)
  await Bun.sleep(100)
  expect(sand.requests('child')).toHaveLength(1)

  sand.turns.interrupt(sand.sessions.require(first!.id))
  await until(() => prompts(parent).some(text => text.includes('Second done.')))
})
