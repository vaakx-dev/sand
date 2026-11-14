import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { Database } from 'bun:sqlite'
import { appendFile, mkdtemp, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { type Build, derivedBuild, previousBuild, thisBuild } from './builds'
import { fakeGithub } from './github'
import { ask, damagedCopies, install, makeSand, remove, type Sand, sand, start, update } from './sand'

const minute = 60_000
const wantedAddons = ['git', 'file-viewer']
const rollbackLines = ['went back to the previous sand build', 'is not healthy']

const github = fakeGithub()
const homes: Sand[] = []
let work: string
let previous: Build
let current: Build
let later: Promise<Build> | undefined

const laterBuild = () =>
  (later ??= derivedBuild(current, join(work, 'later'), root => appendFile(join(root, 'plugins', 'host', 'daemon', 'src', 'host', 'settings.ts'), `\nexport const upgradeVariant = ${Date.now()}\n`)))

beforeAll(async () => {
  work = await mkdtemp(join(tmpdir(), 'sand-upgrade-work-'))
  ;[previous, current] = await Promise.all([previousBuild(), thisBuild(join(work, 'current'))])
  console.log(`previous build ${previous.id}, this build ${current.id}`)
}, 20 * minute)

afterAll(async () => {
  for (const home of homes) await remove(home, github)
  github.stop()
  if (github.missed.length) console.log(`the fake GitHub had nothing for:\n${[...new Set(github.missed)].join('\n')}`)
  await rm(work, { recursive: true, force: true })
}, 5 * minute)

const freshSand = async () => {
  const made = await makeSand()
  homes.push(made)
  return made
}

const installed = async (target: Sand, tag: string, build: Build) => {
  const done = await install(target, github, tag, build)
  if (!done.current?.startsWith(build.id)) throw new Error(`the install script did not install build ${build.id}:\n${done.output}`)
  const report = await start(target, github)
  expect(report.failedPlugins).toEqual([])
  return report
}

const withSand = (body: (target: Sand) => Promise<void>) => async () => {
  const target = await freshSand()
  try {
    await body(target)
  } catch (error) {
    const tail = (await target.log()).split('\n').slice(-80).join('\n')
    console.log(`server.log of ${target.home}:\n${tail}`)
    throw error
  }
}

const useDatabase = async (target: Sand) => {
  const sent = await ask<{ thread: string }>(target, 'thread.start', { cwd: target.home, prompt: 'Remember this chat across the update', origin: 'user', clientRequestId: crypto.randomUUID() })
  const bot = await ask<{ id: string }>(target, 'bot.create', { name: 'Upgrade bot' })
  return { thread: sent.thread, bot: bot.id }
}

const expectNoRollback = (log: string) => {
  for (const line of rollbackLines) expect(log).not.toContain(line)
}

const addonStamp = (target: Sand, id: string) => Bun.file(join(target.home, 'plugins', id, 'sand-addon.json')).json() as Promise<{ hash: string }>

describe('updating a real install', () => {
  test(
    "the previous build with add-ons and a used database updates to this build and stays on it",
    withSand(async target => {
      github.point('dev', previous.folder)
      await installed(target, 'dev', previous)
      const addons = wantedAddons.filter(id => previous.addons[id] && current.addons[id])
      expect(addons.length).toBeGreaterThan(0)
      const added = await sand(target, github, 'addons', 'install', ...addons)
      expect(added.code, added.output).toBe(0)
      for (const id of addons) expect((await addonStamp(target, id)).hash).toBe(previous.addons[id]!)
      const used = await useDatabase(target)

      github.point('dev', current.folder)
      const result = await update(target, current)
      const log = await target.log()

      expect(result.current).toStartWith(current.id)
      expectNoRollback(log)
      expect(result.health?.runtime).toBe('ready')
      expect(result.health?.web).toBe(true)
      expect(result.health?.failedPlugins).toEqual([])
      expect(result.state?.current?.id).toBe(current.id)
      const threads = await ask<{ thread: string }[]>(target, 'thread.list', {})
      expect(threads.map(row => row.thread)).toContain(used.thread)
      const bots = await ask<{ id: string }[]>(target, 'bot.list', {})
      expect(bots.map(bot => bot.id)).toContain(used.bot)
      for (const id of addons) expect((await addonStamp(target, id)).hash).toBe(current.addons[id]!)
    }),
    20 * minute,
  )

  test(
    'an installed add-on that no longer fits the core is turned off, and sand stays on the new build',
    withSand(async target => {
      github.point('dev', current.folder)
      await installed(target, 'dev', current)
      const added = await sand(target, github, 'addons', 'install', 'git')
      expect(added.code, added.output).toBe(0)
      await breakAddon(join(target.home, 'plugins', 'git'))
      const next = await laterBuild()

      github.point('dev', next.folder, { without: ['git'] })
      const result = await update(target, next)
      const log = await target.log()

      expect(result.current).toStartWith(next.id)
      expectNoRollback(log)
      expect(result.health?.runtime).toBe('ready')
      expect(result.health?.failedPlugins).toEqual([])
      const fault = (await Bun.file(join(target.home, 'plugins', 'git', 'sand-addon-fault.json')).json()) as { error: string }
      expect(log).toContain(fault.error.split('\n')[0]!)
    }),
    20 * minute,
  )

  test(
    'a failed update does not go back to a build older than the database',
    withSand(async target => {
      github.point('dev', current.folder)
      await installed(target, 'dev', current)
      const broken = await derivedBuild(current, join(work, 'broken'), breakCore)
      recordUpgrade(target, broken)

      github.point('dev', broken.folder)
      const result = await update(target, broken)
      const log = await target.log()

      expect(result.current).toStartWith(broken.id)
      expect(log).not.toContain('went back to the previous sand build')
      expect(log).toContain('older than your data')
      expect(JSON.stringify(result.state)).toContain('older than your data')
    }),
    20 * minute,
  )

  test(
    'damaged state files are set aside and the update goes through',
    withSand(async target => {
      github.point('dev', current.folder)
      await installed(target, 'dev', current)
      await useDatabase(target)
      const next = await laterBuild()
      for (const name of ['drafts.json', 'updates.json']) await damage(join(target.home, name))

      github.point('dev', next.folder)
      const result = await update(target, next)

      expect(result.current).toStartWith(next.id)
      expectNoRollback(await target.log())
      expect(result.health?.runtime).toBe('ready')
      expect(result.health?.failedPlugins).toEqual([])
      expect(await damagedCopies(target.home, 'drafts.json')).toHaveLength(1)
      expect(await damagedCopies(target.home, 'updates.json')).toHaveLength(1)
    }),
    20 * minute,
  )

  test(
    'the install script refuses a build older than the database unless told to',
    withSand(async target => {
      github.point('dev', current.folder)
      github.point('previous', previous.folder)
      await installed(target, 'dev', current)
      await sand(target, github, 'stop')

      const refused = await install(target, github, 'previous', previous)
      expect(refused.current).toStartWith(current.id)
      expect(refused.output).toContain('SAND_ALLOW_OLDER')

      const allowed = await install(target, github, 'previous', previous, { SAND_ALLOW_OLDER: '1' })
      expect(allowed.current, allowed.output).toStartWith(previous.id)
    }),
    20 * minute,
  )
})

const damage = async (file: string) => {
  if (!(await Bun.file(file).exists())) await Bun.write(file, '{}')
  await appendFile(file, 'x')
}

const recordUpgrade = (target: Sand, build: Build) => {
  const db = new Database(join(target.home, 'sand.db'))
  try {
    db.run('create table if not exists upgraded_by (id integer primary key check (id = 1), build text not null, time integer not null)')
    db.run('insert or replace into upgraded_by (id, build, time) values (1, ?, ?)', [build.id, build.time])
  } finally {
    db.close()
  }
}

const sourceFiles = async (folder: string): Promise<string[]> => {
  const found: string[] = []
  for (const entry of await readdir(folder, { withFileTypes: true, recursive: true })) {
    if (entry.isFile() && entry.name.endsWith('.ts') && !entry.parentPath.includes('node_modules')) found.push(join(entry.parentPath, entry.name))
  }
  return found
}

const breakAddon = async (folder: string) => {
  const stampFile = join(folder, 'sand-addon.json')
  await Bun.write(stampFile, JSON.stringify({ ...(await Bun.file(stampFile).json()), hash: 'an-older-build' }, null, 2))
  for (const file of await sourceFiles(folder)) {
    const text = await Bun.file(file).text()
    const contract = /from '(@sand\/[^']+\/contract)'/.exec(text)?.[1]
    if (!contract || !/^\s*(runtime|host)/m.test(await entryKinds(folder, file))) continue
    await Bun.write(file, `import { upgradeTestMissingExport } from '${contract}'\nupgradeTestMissingExport()\n${text}`)
    return
  }
  throw new Error(`no add-on entry in ${folder} imports a contract`)
}

const entryKinds = async (folder: string, file: string) => {
  const kinds: string[] = []
  for (const manifest of (await readdir(folder, { recursive: true })).filter(path => path.endsWith('package.json') && !path.includes('node_modules'))) {
    const { sand: places = {} } = await Bun.file(join(folder, manifest)).json()
    const root = join(folder, manifest, '..')
    for (const [kind, entry] of Object.entries(places)) if (typeof entry === 'string' && join(root, entry) === file) kinds.push(kind)
  }
  return kinds.join('\n')
}

const breakCore = async (root: string) => {
  await appendFile(join(root, 'plugins', 'host', 'daemon', 'src', 'host', 'settings.ts'), `\nexport const upgradeVariant = ${Date.now()}\n`)
  await appendFile(join(root, 'plugins', 'agent', 'keep-awake', 'src', 'index.ts'), "\nthrow new Error('keep-awake is broken on purpose for the update test')\n")
}
