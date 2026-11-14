import { startSand, type Sand } from '@sand/harness'
import { afterAll, beforeAll, expect, test } from 'bun:test'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { uploadBlob, type PcFetch } from '@sand/transfers/contract'
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

test('a file uploaded over a flaky network arrives whole, and an upload cut off part way resumes without sending its chunks again', async () => {
  const bytes = new Uint8Array(6 * 1024 ** 2 + 5).map((_, index) => (index * 13) % 256)
  const sent: number[] = []
  const dropped = new Set<number>()
  const flaky: PcFetch = async (path, init) => {
    const index = Number(new URL(path, 'http://sand').searchParams.get('index'))
    if (!dropped.has(index)) {
      dropped.add(index)
      throw new TypeError('Failed to fetch')
    }
    sent.push(index)
    return sand.fetch(path, init)
  }
  const resumable = { transfer: crypto.randomUUID(), arrived: new Set<number>() }
  const stop = new AbortController()
  const cut = uploadBlob(flaky, new Blob([bytes]), { resumable, signal: stop.signal, progress: sent => sent > 0 && stop.abort() })
  await expect(cut).rejects.toBeDefined()
  const before = [...resumable.arrived]

  const uploaded = await uploadBlob(flaky, new Blob([bytes]), { resumable })
  const added = await sand.ask(attachmentsAdd, { ...uploaded, name: 'clip.bin' })

  expect(sent.filter(index => before.includes(index))).toHaveLength(before.length)
  expect(readFileSync('path' in added ? added.path : '')).toEqual(Buffer.from(bytes))
})

test('a file named .pdf that holds no PDF is kept as a file, so the model never gets a PDF it rejects', async () => {
  const fake = join(sand.home, 'scan.pdf')
  writeFileSync(fake, new Uint8Array(2048).fill(0))
  const real = join(sand.home, 'real.pdf')
  writeFileSync(real, '%PDF-1.7\n%âãÏÓ\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n')

  expect(await asBot()(attachmentsAdd, { path: fake })).toEqual(expect.objectContaining({ type: 'file', name: 'scan.pdf' }))
  expect(await asBot()(attachmentsAdd, { path: real })).toEqual(expect.objectContaining({ type: 'document', mediaType: 'application/pdf' }))
})
