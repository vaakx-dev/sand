import { startSand } from '@sand/harness'
import { modelSettings, pickSet } from '@sand/model/contract'
import { expect, test } from 'bun:test'
import { join } from 'node:path'
import { z } from 'zod'

const opus = 'fake-a/opus'
const deepseek = 'fake-b/deepseek'

const saved = z.object({ plugins: z.object({ model: z.record(z.string(), z.object({ model: z.string().optional() })) }) })

test('the default, subagent and text models are saved in sand.toml, and an unset one follows the default', async () => {
  const sand = await startSand([
    { id: 'fake-a', models: ['opus'], replies: [] },
    { id: 'fake-b', models: ['deepseek'], replies: [] },
  ])
  try {
    const settings = sand.app.get(modelSettings)!
    const savedModel = async (use: string) => saved.parse(Bun.TOML.parse(await Bun.file(join(sand.home, 'sand.toml')).text())).plugins.model[use]?.model

    expect(settings.pick('text').model).toBe(opus)

    await sand.ask(pickSet, { use: 'default', model: deepseek })
    expect(settings.pick('subagent').model).toBe(deepseek)
    expect(settings.effective(sand.sessions.thread(sand.home)).model).toBe(deepseek)

    const state = await sand.ask(pickSet, { use: 'text', model: opus })
    expect(state.chosen).toEqual({ default: { model: deepseek }, text: { model: opus } })
    expect(settings.pick('text').model).toBe(opus)
    expect(await savedModel('default')).toBe(deepseek)
    expect(await savedModel('text')).toBe(opus)

    await sand.ask(pickSet, { use: 'default', model: null })
    expect(settings.pick('subagent').model).toBe(opus)
    expect(await savedModel('default')).toBeUndefined()
  } finally {
    await sand.stop()
  }
})
