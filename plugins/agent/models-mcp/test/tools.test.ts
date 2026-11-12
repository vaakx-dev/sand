import { startSand, type Sand } from '@sand/harness'
import { afterAll, beforeAll, expect, test } from 'bun:test'
import { listTool } from '../src/tools'

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
