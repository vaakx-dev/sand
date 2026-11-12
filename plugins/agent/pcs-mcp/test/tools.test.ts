import { startSand, type Sand } from '@sand/harness'
import { afterAll, beforeAll, expect, test } from 'bun:test'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { copyTool } from '../src/tools'

let sand: Sand

beforeAll(async () => {
  sand = await startSand([{ id: 'fake', models: ['m'], replies: [] }], { plugins: ['core/transfers'] })
})

afterAll(() => sand.stop())

test('pc_copy copies within this PC, reading paths from where the thread works', async () => {
  const here = join(sand.home, 'work')
  mkdirSync(join(here, 'notes'), { recursive: true })
  writeFileSync(join(here, 'notes', 'a.txt'), 'a\n')

  const copied = await copyTool.run({ from: 'notes', to: 'kept' }, { call: sand.ask, here })

  expect(copied).toEqual({ folder: true, size: expect.any(Number), to: join(here, 'kept') })
  expect(readFileSync(join(here, 'kept', 'a.txt'), 'utf8')).toBe('a\n')
})

test('pc_copy to a PC this PC is not linked to says so', async () => {
  await expect(copyTool.run({ from: join(sand.home, 'x'), to: '/tmp/x', toPc: 'Desk' }, { call: sand.ask })).rejects.toThrow("can't reach your other PCs")
})
