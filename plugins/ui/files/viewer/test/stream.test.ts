import { startSand, type Sand } from '@sand/harness'
import { afterEach, expect, test } from 'bun:test'
import { join } from 'node:path'
import { filesStream } from '../src/contract'

let sand: Sand

afterEach(() => sand.stop())

test('a stream link serves the byte range a player asks for, and nothing once it is tampered with', async () => {
  sand = await startSand([], { plugins: ['ui/files/viewer'] })
  const path = join(sand.home, 'tide.webm')
  await Bun.write(path, 'abcdefghijklmnopqrstuvwxyz')
  const link = await sand.ask(filesStream, { path })

  const part = await sand.fetch(link, { headers: { range: 'bytes=5-9' } })
  expect(part.status).toBe(206)
  expect(await part.text()).toBe('fghij')

  const tampered = link.replace(/\/file-stream\/[^.]+/, `/file-stream/${Buffer.from(join(sand.home, 'other.webm')).toString('base64url')}`)
  expect((await sand.fetch(tampered)).status).toBe(403)
})
