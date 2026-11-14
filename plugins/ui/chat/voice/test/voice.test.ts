import { loginKey } from '@sand/accounts/contract'
import { startSand, type Sand } from '@sand/harness'
import { uploadBlob } from '@sand/transfers/contract'
import { afterAll, beforeAll, expect, test } from 'bun:test'
import { rmSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod'
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
    if (!new URL(request.url).pathname.endsWith('/audio/transcriptions')) return Response.json({ data: [] })
    const form = await request.formData()
    const file = form.get('file')
    heard.push({ key: request.headers.get('authorization'), model: form.get('model'), audio: file instanceof Blob ? await file.bytes() : new Uint8Array() })
    return Response.json({ text: ' Meet me at the library at noon. ' })
  },
})

const speech = new Uint8Array(2048).map((_, index) => index % 251)

const plugins = ['core/transfers', 'ui/chat/voice']

const start = (home?: string, voice?: Record<string, unknown>) =>
  startSand([{ id: 'fake', models: ['m'], replies: [] }], { plugins, ...(home && { home }), ...(voice && { options: { voice } }) })

const transcribe = async (sand: Sand) => sand.ask(voiceTranscribe, await uploadBlob((path, init) => sand.fetch(path, init), new Blob([speech])))

const saveOpenAiKey = (sand: Sand) => sand.ask(loginKey, { account: 'openai', key: 'sk-test', baseUrl: service.url.href })

const savedConfig = z.object({ plugins: z.object({ voice: z.record(z.string(), z.unknown()) }) })

const savedSettings = async (sand: Sand) => savedConfig.parse(Bun.TOML.parse(await Bun.file(join(sand.home, 'sand.toml')).text())).plugins.voice

let first: Sand

beforeAll(async () => {
  first = await start()
})

afterAll(() => {
  service.stop(true)
  rmSync(first.home, { recursive: true, force: true })
})

test('recordings go nowhere until the user picks a place, then only there, with the choice kept in sand.toml', async () => {
  expect((await first.ask(voiceState, {})).destination).toBe('off')
  await expect(transcribe(first)).rejects.toThrow('Voice is off')

  await first.ask(voiceUse, { destination: 'cloud', model: 'whisper-test' })
  await expect(transcribe(first)).rejects.toThrow('Add an OpenAI API key')
  expect(heard).toHaveLength(0)

  await saveOpenAiKey(first)
  expect(await first.ask(voiceState, {})).toMatchObject({ destination: 'cloud', model: 'whisper-test', openai: { url: service.url.href } })
  expect(await transcribe(first)).toEqual({ text: 'Meet me at the library at noon.' })
  expect(heard).toEqual([{ key: 'Bearer sk-test', model: 'whisper-test', audio: speech }])
  const settings = await savedSettings(first)
  expect(settings).toEqual({ destination: 'cloud', model: 'whisper-test' })
  await first.app.dispose()

  const again = await start(first.home, settings)
  await saveOpenAiKey(again)
  expect(await transcribe(again)).toEqual({ text: 'Meet me at the library at noon.' })
  await again.ask(voiceUse, { destination: 'off' })
  await expect(transcribe(again)).rejects.toThrow('Voice is off')
  expect(heard).toHaveLength(2)
  await again.app.dispose()
})
