import { startSand, type Sand } from '@sand/harness'
import { modelSettings } from '@sand/model/contract'
import type { Source } from '@sand/replay/contract'
import { afterEach, expect, test } from 'bun:test'
import { join, resolve } from 'node:path'

let sand: Sand

afterEach(() => sand.stop())

const said = (text: string) => ({ type: 'text', text }) as const

const overflow = { type: 'error', message: 'prompt is too long' } as const

const start = (replies: Source['replies']) =>
  startSand([{ id: 'fake', api: 'anthropic', models: ['m'], replies }], {
    plugins: ['agent/memory', 'agent/project-memory'],
    projects: ['tiles', 'garden'].map(project => ({ project, path: resolve('work', project) })),
  })

const threadIn = (project: string | null) => {
  const session = sand.sessions.thread(sand.home, { project })
  sand.app.get(modelSettings)!.change(session, { model: 'fake/m' })
  return session
}

const bodies = () => sand.requests('fake').map(body => JSON.parse(body))

const toolsOf = (body: { tools?: { name: string }[] }) => (body.tools ?? []).map(tool => tool.name)

const systemOf = (body: { system: { text: string }[] }) => body.system.map(part => part.text).join('\n')

const learned = 'Deploys go through staging first.'

test('threads in a project share its memory; a write mid-chat leaves that chat’s prompt alone and shows in the next thread', async () => {
  const save = { type: 'call', name: 'memory', input: { command: 'create', path: '/memories/memory.md', file_text: learned } } as const
  sand = await start([[save], [said('Saved.')], [said('Sure.')], [said('Hi.')], [said('Hi.')], [said('Hi.')]])
  const writer = threadIn('tiles')

  await sand.turns.run(writer, 'Remember how deploys go')
  await sand.turns.run(writer, 'Thanks')
  await sand.turns.run(threadIn('tiles'), 'Hello')
  await sand.turns.run(threadIn('garden'), 'Hello')
  await sand.turns.run(threadIn(null), 'Hello')

  const [first, , second, sameProject, otherProject, noProject] = bodies()
  expect(await Bun.file(join(sand.home, 'project-memory', 'tiles', 'memory.md')).text()).toBe(learned)
  expect(second.system).toEqual(first.system)
  expect(systemOf(second)).not.toContain(learned)
  expect(systemOf(sameProject)).toContain(`<memory>\n${learned}\n</memory>`)
  expect(systemOf(otherProject)).not.toContain(learned)
  expect(toolsOf(first)).toContain('memory')
  expect(toolsOf(noProject)).not.toContain('memory')
})

test("a thread tidies its project's memory when it compacts", async () => {
  const compacted = said(`<summary>\n## Working on\n- Shipping\n</summary>\n<memory>\n${learned}\n</memory>\n<notes>\n</notes>`)
  sand = await start([[said('Noted.')], [overflow], [compacted], [said('Shipped.')]])
  const thread = threadIn('tiles')

  await sand.turns.run(thread, 'Deploys go through staging first')
  await sand.turns.run(thread, 'Ship it')

  expect(await Bun.file(join(sand.home, 'project-memory', 'tiles', 'memory.md')).text()).toBe(`${learned}\n`)
  expect(systemOf(bodies()[3])).toContain(`<memory>\n${learned}\n</memory>`)
})
