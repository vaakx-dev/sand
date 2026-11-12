import { PcUnavailable, type Peers, type PeerView, peers } from '@sand/devices-contract'
import { startSand, type Sand } from '@sand/harness'
import { memory, memoryChange, memoryRead, memoryStore, memoryWrite } from '@sand/memory/contract'
import { modelSettings } from '@sand/model/contract'
import type { Source } from '@sand/replay/contract'
import { afterEach, expect, setSystemTime, test } from 'bun:test'
import { join, resolve } from 'node:path'

let sand: Sand
let others: Sand[] = []

afterEach(async () => {
  await Promise.all([sand, ...others].map(running => running.stop()))
  others = []
})

const said = (text: string) => ({ type: 'text', text }) as const

const overflow = { type: 'error', message: 'prompt is too long' } as const

const start = (replies: Source['replies'] = []) =>
  startSand([{ id: 'fake', api: 'anthropic', models: ['m'], replies }], {
    plugins: ['agent/memory', 'agent/project-memory'],
    projects: ['tiles', 'garden'].map(project => ({ project, path: resolve('work', project) })),
  })

const threadIn = (project: string | null, on = sand) => {
  const session = on.sessions.thread(on.home, { project })
  on.app.get(modelSettings)!.change(session, { model: 'fake/m' })
  return session
}

const bodies = (on = sand) => on.requests('fake').map(body => JSON.parse(body))

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

interface Link {
  peers: Peers
  open(): void
  drop(): void
}

const pcView = (id: string): PeerView => ({
  id,
  name: id,
  status: { phase: 'connected', route: { key: 'lan', kind: 'lan', source: 'seed', url: `http://${id}` }, since: 0 },
  routes: [],
  attempts: [],
})

const link = (far: Sand, farId: string, nearId: string): Link => {
  const view = pcView(farId)
  const opens = new Set<(pc: string) => void>()
  const asNear = far.askAs({ device: nearId, kind: 'pc' })
  let up = true
  const call: Peers['call'] = (_, request, input) => (up ? asNear(request, input) : Promise.reject(new PcUnavailable(farId, farId, { phase: 'offline' })))
  return {
    peers: {
      list: () => [view],
      get: pc => (pc === farId ? view : undefined),
      connected: () => (up ? [farId] : []),
      call,
      callEach: (request, input) =>
        call(farId, request, input).then(
          value => [{ pc: farId, ok: true, value }],
          (error: unknown) => [{ pc: farId, ok: false, error }],
        ),
      fetch: () => Promise.reject(new Error('no fetch')),
      on: () => () => {},
      hello: () => undefined,
      directUrl: () => undefined,
      retry() {},
      onOpen(listener) {
        opens.add(listener)
        return () => void opens.delete(listener)
      },
      onChange: () => () => {},
    },
    open() {
      up = true
      for (const listener of opens) listener(farId)
    },
    drop() {
      up = false
    },
  }
}

const pair = (home: Sand, box: Sand) => {
  const toBox = link(box, 'box', 'home')
  const toHome = link(home, 'home', 'box')
  home.app.provide(peers, toBox.peers)
  box.app.provide(peers, toHome.peers)
  return { toBox, toHome }
}

const tiles = { space: 'project', id: 'tiles' }

const nextMemory = (on: Sand, text: string) =>
  new Promise<void>(resolve => {
    const stop = on.app.on(memoryChange, (ref, written) => {
      if (ref.id === tiles.id && written === text) resolve(stop())
    })
  })

const nextStore = (on: Sand) =>
  new Promise<void>(resolve => {
    const stop = on.app.on(memoryStore, ref => {
      if (ref.id === tiles.id) resolve(stop())
    })
  })

const noteIn = (on: Sand, name: string) => Bun.file(join(on.home, 'project-memory', 'tiles', 'notes', `${name}.md`)).text()

test('what the user edits on one PC is what a thread on another PC sees, and what that thread writes comes back', async () => {
  const fromThread = 'Staging is at staging.tiles.test.'
  const save = { type: 'call', name: 'memory', input: { command: 'create', path: '/memories/memory.md', file_text: fromThread } } as const
  sand = await start()
  const box = await start([[save], [said('Saved.')]])
  others.push(box)
  pair(sand, box)

  const reachedBox = nextMemory(box, learned)
  await sand.ask(memoryWrite, { ...tiles, text: learned })
  await reachedBox

  const cameHome = nextMemory(sand, fromThread)
  await box.turns.run(threadIn('tiles', box), 'Remember where staging is')
  await cameHome

  expect(systemOf(bodies(box)[0])).toContain(`<memory>
${learned}
</memory>`)
  expect(await sand.ask(memoryRead, tiles)).toBe(fromThread)
})

test('while the PCs are apart each keeps its own edits, and they merge when the PCs reconnect, the later edit winning', async () => {
  sand = await start()
  const box = await start()
  others.push(box)
  const { toBox, toHome } = pair(sand, box)
  const shared = nextMemory(box, 'Draft.')
  await sand.ask(memoryWrite, { ...tiles, text: 'Draft.' })
  await shared
  toBox.drop()
  toHome.drop()

  const apart = Date.now() + 60_000
  setSystemTime(apart)
  await sand.ask(memoryWrite, { ...tiles, text: 'Older edit from home.' })
  await sand.app.get(memory)!.writeNote(tiles, { name: 'staging', text: 'Staging resets nightly.' })
  setSystemTime(apart + 1000)
  await box.ask(memoryWrite, { ...tiles, text: learned })
  setSystemTime()

  const merged = Promise.all([nextStore(sand), nextStore(box)])
  toHome.open()
  toBox.open()
  await merged

  expect(await sand.ask(memoryRead, tiles)).toBe(learned)
  expect(await box.ask(memoryRead, tiles)).toBe(learned)
  expect(await noteIn(box, 'staging')).toBe('Staging resets nightly.')
})
