import { expect, test } from 'bun:test'
import type { FeatureDefinition } from '../src/contract'
import { createCatalog } from '../src/features/catalog'

const feature = (id: string, more: Partial<FeatureDefinition> = {}): FeatureDefinition => ({ id, kind: 'feature', label: id, summary: '', needs: [], uses: [], addon: false, ...more })
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

test("a feature that needs one nobody defines, like an add-on that isn't installed, stays off", () => {
  const catalog = createCatalog([...definitions, feature('logbook-tab', { needs: ['logbook'] })], undefined)
  expect(catalog.on('logbook-tab')).toBe(false)
  expect(catalog.on('bots')).toBe(true)
})

test('an add-on is off until it is turned on, with or without a [features] table', () => {
  const addons = [...definitions, feature('logbook', { addon: true }), feature('math', { addon: true })]
  expect(createCatalog(addons, undefined).on('logbook')).toBe(false)
  const catalog = createCatalog(addons, { math: true, threads: false })
  expect([catalog.on('logbook'), catalog.on('math'), catalog.on('threads'), catalog.on('bots')]).toEqual([false, true, false, true])
  catalog.choose({ logbook: true })
  expect(catalog.on('logbook')).toBe(true)
})
