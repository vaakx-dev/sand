import { startSand, type Sand } from '@sand/harness'
import { uploadBlob } from '@sand/transfers/contract'
import { afterAll, beforeAll, expect, test } from 'bun:test'
import { rmSync } from 'node:fs'
import { voiceState, voiceTranscribe, voiceUse } from '../src/contract'

interface Heard {
  key: string | null
  model: FormDataEntryValue | null
  audio: Uint8Array
}

const heard: Heard[] = []

const service = Bun.serve({
  port: 0,
  async fetch(request) {
    const form = await request.formData()
    const file = form.get('file')
    heard.push({ key: request.headers.get('authorization'), model: form.get('model'), audio: file instanceof Blob ? await file.bytes() : new Uint8Array() })
    return Response.json({ text: ' Meet me at the library at noon. ' })
  },
})

const speech = new Uint8Array(2048).map((_, index) => index % 251)

const plugins = ['core/transfers', 'ui/chat/voice']

const start = (home?: string) => startSand([{ id: 'fake', models: ['m'], replies: [] }], { plugins, ...(home && { home }) })

const transcribe = async (sand: Sand) => sand.ask(voiceTranscribe, await uploadBlob((path, init) => sand.fetch(path, init), new Blob([speech])))

let first: Sand

beforeAll(async () => {
  first = await start()
})

afterAll(() => {
  service.stop(true)
  rmSync(first.home, { recursive: true, force: true })
})

test('recordings go nowhere until the user picks a service, then only to it, with the key kept across restarts', async () => {
  expect((await first.ask(voiceState, {})).destination).toBe('off')
  await expect(transcribe(first)).rejects.toThrow('Voice is off')
  expect(heard).toHaveLength(0)

  await expect(first.ask(voiceUse, { destination: 'cloud', service: 'groq', url: service.url.href, model: 'whisper-large-v3-turbo' })).rejects.toThrow('Enter your Groq key')
  const chosen = await first.ask(voiceUse, { destination: 'cloud', service: 'other', url: service.url.href, model: 'whisper-test', key: 'sk-test' })
  expect(chosen).toMatchObject({ destination: 'cloud', keys: ['other'] })
  expect(await transcribe(first)).toEqual({ text: 'Meet me at the library at noon.' })
  expect(heard).toEqual([{ key: 'Bearer sk-test', model: 'whisper-test', audio: speech }])
  await first.app.dispose()

  const again = await start(first.home)
  expect(await transcribe(again)).toEqual({ text: 'Meet me at the library at noon.' })
  await again.ask(voiceUse, { destination: 'off' })
  await expect(transcribe(again)).rejects.toThrow('Voice is off')
  expect(heard).toHaveLength(2)
  await again.app.dispose()
})
