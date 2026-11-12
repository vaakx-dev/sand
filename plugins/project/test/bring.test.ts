import { type Peers, type PeerView, peers } from '@sand/devices-contract'
import { loadPcIdentity } from '@sand/devices-identity/pc'
import { gitRunner } from '@sand/git-runner/contract'
import { startSand, type Sand } from '@sand/harness'
import { createHandlers } from '@sand/host-hub/contract'
import { hostChannel } from '@sand/host-runtimes/contract'
import { afterAll, beforeAll, expect, test } from 'bun:test'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { projectsBring, projectsIgnored } from '../src/contract'
import { manageRequests } from '../src/manage/requests'
import { createRegistry } from '../src/registry/registry'
import { projectRoot } from '../src/registry/root'
import { projectStore } from '../src/registry/store'

const model = { id: 'fake', models: ['m'], replies: [] }
const othersOff = ['bots', 'calendar', 'computers', 'pcs', 'notifications', 'mcp-server', 'updates'].map(id => `${id} = false`)

const sands: Sand[] = []

afterAll(() => Promise.all(sands.map(sand => sand.stop())))

const git = (cwd: string, ...args: string[]) => {
  const run = Bun.spawnSync(['git', '-c', 'user.name=Sand', '-c', 'user.email=sand@example.com', ...args], { cwd })
  if (run.exitCode !== 0) throw new Error(run.stderr.toString())
  return run.stdout.toString().trim()
}

const write = (folder: string, files: Record<string, string>) => {
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(join(folder, path, '..'), { recursive: true })
    writeFileSync(join(folder, path), text)
  }
}

const pc = async (off: string[] = []) => {
  const sand = await startSand([model], { config: `[features]\n${[...othersOff, ...off].join('\n')}` })
  sands.push(sand)
  const device = (await loadPcIdentity(sand.home)).id
  const store = await projectStore(sand.home, error => {
    throw error
  })
  const runner = () => sand.app.get(gitRunner)
  const registry = createRegistry(store, device, { changed() {}, pull: async () => {}, git: runner })
  const host = createHandlers()
  const root = await projectRoot(sand.home)
  for (const setup of manageRequests({ hub: host, registry, root, device, pcs: () => [], git: runner, placeChanged() {} })) setup()
  sand.app.provide(hostChannel, { call: (request, input) => host.ask(request, input, { device, kind: 'runtime' }), ask: host.ask, on: () => () => {} })
  return { sand, device, registry }
}

type Pc = Awaited<ReturnType<typeof pc>>

const link = (near: Pc, far: Pc) => {
  const view: PeerView = {
    id: far.device,
    name: 'Desk',
    status: { phase: 'connected', route: { key: 'lan', kind: 'lan', source: 'seed', url: 'http://desk' }, since: 0 },
    routes: [],
    attempts: [],
  }
  const asNear = far.sand.askAs({ device: near.device, kind: 'pc' })
  const call: Peers['call'] = (_, request, input) => asNear(request, input)
  near.sand.app.provide(peers, {
    list: () => [view],
    get: id => (id === far.device ? view : undefined),
    connected: () => [far.device],
    call,
    callEach: async () => [],
    fetch: (_, path, init) => far.sand.fetch(path, init),
    on: () => () => {},
    hello: () => undefined,
    directUrl: () => undefined,
    retry() {},
    onOpen: () => () => {},
    onChange: () => () => {},
  })
}

let far: Pc
let near: Pc
let bare: Pc

beforeAll(async () => {
  far = await pc()
  near = await pc()
  bare = await pc(['attachments = false', 'git = false'])
  link(near, far)
  link(bare, far)
}, 60_000)

const project = async (name: string) => {
  const source = join(far.sand.home, name)
  const remote = join(far.sand.home, `${name}.git`)
  write(source, { 'README.md': '# App\n', '.gitignore': 'node_modules/\n.env\n*.log\n' })
  git(source, 'init', '-q')
  git(source, 'add', '.')
  git(source, 'commit', '-q', '-m', 'start')
  git(far.sand.home, 'clone', '-q', '--bare', source, remote)
  git(source, 'remote', 'add', 'origin', remote)
  write(source, { 'notes.txt': 'not committed yet\n', '.env': 'SECRET=1\n', 'debug.log': 'noise\n', 'node_modules/pkg/index.js': 'module.exports = 1\n' })
  return { source, remote, id: await known(source) }
}

const known = async (source: string) => {
  const added = await far.registry.add(source)
  await Promise.all([near, bare].map(to => to.registry.merge([added])))
  return added.id
}

const bring = (to: Pc, id: string, folder: string, how: 'clone' | 'copy', files: string[] = []) =>
  to.sand.ask(projectsBring, { project: id, from: far.device, path: join(to.sand.home, folder), how, files })

const tree = (folder: string) => readdirSync(folder, { recursive: true, encoding: 'utf8' }).map(path => path.replaceAll('\\', '/'))

const outsideGit = (folder: string) => tree(folder).filter(path => path !== '.git' && !path.startsWith('.git/'))

test('copying a project brings what git keeps, its history and the ticked ignored files, and adds a second copy to the same project', async () => {
  const { source, id } = await project('copied')

  expect(await far.sand.ask(projectsIgnored, { path: source })).toEqual({
    files: [
      { path: '.env', size: 9 },
      { path: 'debug.log', size: 6 },
    ],
    folders: ['node_modules'],
    truncated: false,
  })

  const copy = join(near.sand.home, 'copied')
  expect(await bring(near, id, 'copied', 'copy', ['.env'])).toMatchObject({ project: id, folder: copy })
  expect(outsideGit(copy).sort()).toEqual(['.env', '.gitignore', 'README.md', 'notes.txt'])
  expect(readFileSync(join(copy, '.env'), 'utf8')).toBe('SECRET=1\n')
  expect(git(copy, 'rev-parse', 'HEAD')).toBe(git(source, 'rev-parse', 'HEAD'))
  expect(git(copy, 'status', '--porcelain')).toBe('?? notes.txt')

  const { copies } = await near.registry.find(id)
  expect(copies[far.device]?.path).toBe(source)
  expect(copies[near.device]?.path).toBe(copy)
})

test('cloning a project checks out its remote and copies only the ticked ignored files', async () => {
  const { remote, id } = await project('cloned')

  const clone = join(near.sand.home, 'cloned')
  await bring(near, id, 'cloned', 'clone', ['.env'])
  expect(outsideGit(clone).sort()).toEqual(['.env', '.gitignore', 'README.md'])
  expect(git(clone, 'remote', 'get-url', 'origin')).toBe(remote)
  expect((await near.registry.find(id)).copies[near.device]?.path).toBe(clone)
})

test('a folder outside git is copied whole, and has nothing to clone', async () => {
  const plain = join(far.sand.home, 'plain')
  write(plain, { 'a.txt': 'a\n', 'node_modules/b.js': 'b\n' })
  const id = await known(plain)

  expect(await far.sand.ask(projectsIgnored, { path: plain })).toEqual({ files: [], folders: [], truncated: false })
  await expect(bring(near, id, 'plain', 'clone')).rejects.toThrow('has no git remote')
  expect(existsSync(join(near.sand.home, 'plain'))).toBe(false)
  await bring(near, id, 'plain', 'copy')
  expect(tree(join(near.sand.home, 'plain')).sort()).toEqual(['a.txt', 'node_modules', 'node_modules/b.js'])
})

test('a failed bring explains itself and leaves the folder as it was', async () => {
  const { remote, id } = await project('failed')

  write(join(near.sand.home, 'taken'), { 'keep.txt': 'mine\n' })
  await expect(bring(near, id, 'taken', 'copy')).rejects.toThrow("isn't empty")
  expect(tree(join(near.sand.home, 'taken'))).toEqual(['keep.txt'])

  rmSync(remote, { recursive: true, force: true })
  await expect(bring(near, id, 'gone', 'clone')).rejects.toThrow('copy the files instead')
  expect(existsSync(join(near.sand.home, 'gone'))).toBe(false)
})

test('with transfers and git off on the PC it goes to, bringing says which plugin is missing and changes nothing', async () => {
  const { id } = await project('unplugged')

  await expect(bring(bare, id, 'unplugged', 'copy')).rejects.toThrow('File transfers plugin, which is off')
  await expect(bring(bare, id, 'unplugged', 'clone')).rejects.toThrow('Git runner plugin, which is off')
  expect(existsSync(join(bare.sand.home, 'unplugged'))).toBe(false)
})
