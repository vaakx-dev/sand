import { startSand, type Sand } from '@sand/harness'
import { afterAll, beforeAll, expect, test } from 'bun:test'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { attachmentsAdd } from '../src/contract'

let sand: Sand

beforeAll(async () => {
  sand = await startSand([{ id: 'fake', models: ['m'], replies: [] }], { plugins: ['core/transfers', 'agent/attachments'] })
})

afterAll(() => sand.stop())

const asBot = () => sand.askAs({ device: 'sand', kind: 'agent', actor: { owner: 'bot', id: 'b1' } })

test('an agent attaches a file on this PC by a path relative to its folder; sand keeps its own copy', async () => {
  const work = join(sand.home, 'work')
  mkdirSync(work, { recursive: true })
  const bytes = new Uint8Array(4096).map((_, index) => (index * 7) % 256)
  writeFileSync(join(work, 'data.bin'), bytes)

  const added = await asBot()(attachmentsAdd, { path: 'data.bin', cwd: work })

  expect(added).toEqual(expect.objectContaining({ type: 'file', name: 'data.bin', size: bytes.length }))
  const kept = 'path' in added ? added.path : ''
  expect(kept.startsWith(join(sand.home, 'uploads'))).toBe(true)
  expect(readFileSync(kept)).toEqual(Buffer.from(bytes))
  expect(readFileSync(join(work, 'data.bin'))).toEqual(Buffer.from(bytes))
})

test('a text file becomes a document the model reads, and a missing one says so', async () => {
  const notes = join(sand.home, 'notes.md')
  writeFileSync(notes, '# Plan\nShip it.\n')

  expect(await asBot()(attachmentsAdd, { path: notes })).toEqual(expect.objectContaining({ type: 'document', name: 'notes.md' }))
  await expect(asBot()(attachmentsAdd, { path: join(sand.home, 'gone.txt') })).rejects.toThrow('No file at')
})
