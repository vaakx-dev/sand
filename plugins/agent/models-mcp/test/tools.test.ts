import { startSand, type Sand } from '@sand/harness'
import { afterAll, beforeAll, expect, test } from 'bun:test'
import { join } from 'node:path'
import { listTool, priceTool } from '../src/tools'

let sand: Sand

beforeAll(async () => {
  sand = await startSand([{ id: 'fake', models: ['a', 'b'], replies: [] }])
})

afterAll(() => sand.stop())

test('model_list lists the models and marks the one the thread uses', async () => {
  const chat = sand.chat('fake/b')

  const rows = await listTool.run({ thread: chat.id }, { call: sand.ask })

  expect(rows).toEqual([expect.objectContaining({ id: 'fake/a' }), expect.objectContaining({ id: 'fake/b', current: true })])
  expect(rows).toEqual([expect.not.objectContaining({ current: true }), expect.anything()])
})

test('model_price_set prices a model at once and keeps the price in sand.toml beside the other settings', async () => {
  const config = '[plugins.accounts]\nstream_idle_ms = 60000\n\n[plugins.accounts.prices.a]\ninput = 1\noutput = 1\ncache_read = 0\ncache_write = 0\n'
  const configured = await startSand([{ id: 'fake', models: ['a', 'b'], replies: [] }], { config })
  try {
    await priceTool.run({ model: 'a', input: 3, output: 12, cache_read: 0.3 }, { call: configured.ask })
    await priceTool.run({ model: 'fake/b', input: 2, output: 8 }, { call: configured.ask })

    expect(configured.llm.price?.('fake/a')).toEqual({ input: 3, output: 12, cacheRead: 0.3, cacheWrite: 3 })
    expect(configured.llm.price?.('fake/b')).toEqual({ input: 2, output: 8, cacheRead: 2, cacheWrite: 2 })
    const saved = Bun.TOML.parse(await Bun.file(join(configured.home, 'sand.toml')).text())
    expect(saved).toMatchObject({
      plugins: {
        accounts: {
          stream_idle_ms: 60000,
          prices: { a: { input: 3, output: 12, cache_read: 0.3, cache_write: 3 }, 'fake/b': { input: 2, output: 8, cache_read: 2, cache_write: 2 } },
        },
      },
    })
  } finally {
    await configured.stop()
  }
})
