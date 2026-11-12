import { features } from '@sand/config/contract'
import { expect, test } from 'bun:test'
import { join } from 'node:path'
import { fresh, running } from './boot'

test('a new install starts with the core on and every add-on off, and turning one on keeps the others off', async () => {
  const sand = await fresh()
  try {
    expect(sand.problems()).toEqual([])
    expect(running(sand)).toEqual(['sessions', 'bots', 'engine', 'llm', 'tools', 'schedules', 'htmlPages'])
    const addons = sand.app.get(features)!.list().filter(feature => feature.addon)
    expect(addons.filter(feature => feature.on)).toEqual([])

    await sand.app.get(features)!.set({ calendar: true })
    await sand.app.settled()
    expect(running(sand)).toContain('calendars')
    expect(running(sand)).not.toContain('gitRepo')
    const written = Bun.TOML.parse(await Bun.file(join(sand.home, 'sand.toml')).text()) as { features: Record<string, boolean> }
    expect(Object.keys(written.features).toSorted()).toEqual(addons.map(feature => feature.id).filter(id => id !== 'calendar').toSorted())
  } finally {
    await sand.stop()
  }
})
