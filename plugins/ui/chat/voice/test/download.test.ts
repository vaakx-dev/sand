import { afterAll, expect, test } from 'bun:test'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { download } from '../src/runtime/local/download'

const model = new Uint8Array(300_000).map((_, index) => (index * 13) % 256)

const sha256 = (bytes: Uint8Array) => new Bun.CryptoHasher('sha256').update(bytes).digest('hex')

const ranges: (string | null)[] = []

const server = Bun.serve({
  port: 0,
  fetch(request) {
    const range = request.headers.get('range')
    ranges.push(range)
    const from = Number(range?.match(/^bytes=(\d+)-$/)?.[1] ?? 0)
    return new Response(model.slice(from), { status: from ? 206 : 200 })
  },
})

const folder = mkdtempSync(join(tmpdir(), 'sand-voice-'))

afterAll(() => {
  server.stop(true)
  rmSync(folder, { recursive: true, force: true })
})

const source = { url: server.url.href, bytes: model.length, sha256: sha256(model) }

test('a download that stopped part way resumes from where it stopped and is checked whole', async () => {
  const file = join(folder, 'resumed.gguf')
  writeFileSync(`${file}.part`, model.slice(0, 100_000))
  const steps: string[] = []

  await download({ source, file, signal: new AbortController().signal, progress: step => steps.push(step.status) })

  expect(ranges.at(-1)).toBe('bytes=100000-')
  expect(steps[0]).toBe('checking')
  expect(readFileSync(file)).toEqual(Buffer.from(model))
})

test('a download that does not match is deleted instead of used', async () => {
  const file = join(folder, 'wrong.gguf')

  const wrong = download({ source: { ...source, sha256: sha256(new Uint8Array(1)) }, file, signal: new AbortController().signal, progress: () => {} })

  await expect(wrong).rejects.toThrow("didn't match")
  expect(await Bun.file(file).exists()).toBe(false)
  expect(await Bun.file(`${file}.part`).exists()).toBe(false)
})
