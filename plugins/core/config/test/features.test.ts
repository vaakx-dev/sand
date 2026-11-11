import { expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { FeatureDefinition } from '../src/contract'
import { createCatalog } from '../src/features/catalog'
import { writeFeatures } from '../src/features/toml'

const feature = (id: string, more: Partial<FeatureDefinition> = {}): FeatureDefinition => ({ id, kind: 'feature', label: id, summary: '', needs: [], uses: [], offer: false, ...more })
const capability = (id: string, more: Partial<FeatureDefinition> = {}) => feature(id, { kind: 'capability', ...more })

const definitions = [
  feature('threads', { needs: ['engine'], uses: ['compaction'] }),
  feature('git', { parent: 'threads' }),
  feature('worktrees', { parent: 'git' }),
  feature('bots', { needs: ['engine'] }),
  feature('calendar'),
  capability('engine', { needs: ['models'] }),
  capability('models'),
  capability('compaction', { needs: ['engine'] }),
  capability('schedules'),
]

const onIds = (catalog: ReturnType<typeof createCatalog>) => catalog.list().flatMap(feature => (feature.on ? [feature.id] : []))

test('a feature that is off turns off its children and their children, and coming back on brings them back', () => {
  const catalog = createCatalog(definitions, { threads: false })
  expect(onIds(catalog)).toEqual(['bots', 'calendar', 'engine', 'models'])
  expect(catalog.list().find(found => found.id === 'git')?.chosen).toBe(true)
  catalog.choose({ threads: true })
  expect(onIds(catalog)).toEqual(['threads', 'git', 'worktrees', 'bots', 'calendar', 'engine', 'models', 'compaction'])
})

test('a capability loads only while an enabled feature needs or uses it', () => {
  const catalog = createCatalog(definitions, { threads: false, bots: false })
  expect(onIds(catalog)).toEqual(['calendar'])
  expect(catalog.list().find(found => found.id === 'schedules')?.on).toBe(false)
  catalog.choose({ bots: true })
  expect(catalog.list().find(found => found.id === 'engine')?.usedBy).toEqual(['bots'])
})

test('switching off a capability turns off the features that need it, but not those that only use it', () => {
  const catalog = createCatalog(definitions, { models: false })
  expect(onIds(catalog)).toEqual(['calendar'])
  catalog.choose({ models: true, compaction: false })
  expect(onIds(catalog)).toEqual(['threads', 'git', 'worktrees', 'bots', 'calendar', 'engine', 'models'])
})

test('plugins of no feature, or of a feature nobody defines, stay on', () => {
  const catalog = createCatalog(definitions, { threads: false })
  expect(catalog.on(undefined)).toBe(true)
  expect(catalog.on('unknown')).toBe(true)
  expect(catalog.on('worktrees')).toBe(false)
})

test('the person was asked once sand.toml has a [features] table', () => {
  expect(createCatalog(definitions, undefined).asked()).toBe(false)
  expect(createCatalog(definitions, {}).asked()).toBe(true)
})

test('writing features keeps the rest of sand.toml and only lists what is off', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'sand-features-'))
  const path = join(dir, 'sand.toml')
  try {
    await Bun.write(path, '# mine\n[host]\nport = 0\n\n[features]\ngit = false # no git\n\n[plugins.web]\npaths = []\n')
    await writeFeatures(path, { git: true, threads: false })
    expect(await Bun.file(path).text()).toBe('# mine\n[host]\nport = 0\n\n[features]\nthreads = false\n\n[plugins.web]\npaths = []\n')
    await writeFeatures(path, { threads: true })
    expect(Bun.TOML.parse(await Bun.file(path).text())).toEqual({ host: { port: 0 }, features: {}, plugins: { web: { paths: [] } } })
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('writing features to a missing sand.toml creates it with the table, even when nothing is off', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'sand-features-'))
  const path = join(dir, 'sand.toml')
  try {
    await writeFeatures(path, { bots: true })
    expect(await Bun.file(path).text()).toBe('[features]\n')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
