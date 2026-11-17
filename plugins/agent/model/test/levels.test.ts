import { levelSet, levelsGet, modelSettings } from '@sand/model/contract'
import { startSand, type Sand } from '@sand/harness'
import { afterAll, beforeAll, expect, test } from 'bun:test'
import { join } from 'node:path'

let sand: Sand

beforeAll(async () => {
  sand = await startSand([
    { id: 'big', models: [{ name: 'opus', efforts: ['low', 'high'] }], replies: [] },
    { id: 'small', models: [{ name: 'haiku', efforts: ['low', 'high'] }], replies: [] },
  ])
})

afterAll(() => sand.stop())

const settings = () => sand.app.get(modelSettings)!

const chosen = ({ model, effort }: { model?: string; effort?: string }) => ({ model, effort })

test('each level runs on its own pick, an unset level on the next heavier one, and the picks live in sand.toml', async () => {
  await sand.ask(levelSet, { level: 'main', model: 'big/opus', effort: 'high' })
  await sand.ask(levelSet, { level: 'sub', model: 'haiku', effort: 'low' })

  expect(chosen(settings().level('background'))).toEqual({ model: 'small/haiku', effort: 'low' })
  expect(chosen(settings().level('light'))).toEqual({ model: 'small/haiku', effort: 'low' })
  expect(chosen(settings().level('bot'))).toEqual({ model: 'big/opus', effort: 'high' })

  await sand.ask(levelSet, { level: 'bot', model: 'small/haiku', effort: 'high' })
  const bot = sand.sessions.bot('b1', sand.home)
  const thread = sand.sessions.thread(sand.home)
  expect(chosen(settings().effective(bot))).toEqual({ model: 'small/haiku', effort: 'high' })
  expect(chosen(settings().effective(thread))).toEqual({ model: 'big/opus', effort: 'high' })

  await sand.ask(levelSet, { level: 'sub', model: null })
  expect(chosen(settings().level('background'))).toEqual({ model: 'big/opus', effort: 'high' })
  expect(Object.keys(await sand.ask(levelsGet, {}))).not.toContain('sub')

  const saved = Bun.TOML.parse(await Bun.file(join(sand.home, 'sand.toml')).text())
  expect(saved).toMatchObject({ plugins: { model: { levels: { main: { model: 'big/opus', effort: 'high' }, bot: { model: 'small/haiku', effort: 'high' } } } } })
})
