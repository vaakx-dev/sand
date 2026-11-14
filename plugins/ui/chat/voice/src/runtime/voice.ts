import type { SavedKey } from '@sand/accounts/contract'
import type { Transfers } from '@sand/transfers/contract'
import { mkdir } from 'node:fs/promises'
import type { Choice, Destination, VoiceState } from '../contract'
import { transcribeInCloud } from './cloud'
import type { Source } from './local/download'
import { LocalSpeech } from './local/speech'

interface Settings {
  destination: Destination
  model: string
}

interface VoiceOptions {
  folder: string
  transfers: Transfers
  settings: Settings
  save(settings: Settings): Promise<void>
  openaiKey(): SavedKey | undefined
  changed(state: VoiceState): void
  model?: Source
}

interface Upload {
  transfer: string
  chunks: number
  size: number
}

const OPENAI_URL = 'https://api.openai.com/v1'

const OFF = 'Voice is off. Choose where your speech is turned into text in Settings › Voice.'

const NO_KEY = 'Add an OpenAI API key in Settings › Accounts to use a cloud service for voice.'

const createVoice = async ({ folder, transfers, settings: initial, save, openaiKey, changed, model }: VoiceOptions) => {
  await mkdir(folder, { recursive: true })
  let settings = initial

  const openai = () => {
    const found = openaiKey()
    return found && { key: found.key, url: found.baseUrl || OPENAI_URL }
  }

  const state = (): VoiceState => {
    const account = openai()
    return { ...settings, local: local.status(), ...(account && { openai: { url: account.url } }) }
  }

  const local = await LocalSpeech.open(folder, () => changed(state()), model)

  const prepareLocal = () => {
    if (local.status().status !== 'ready') void local.prepare()
  }

  const use = async (choice: Choice) => {
    const next = { destination: choice.destination, model: choice.destination === 'cloud' ? choice.model : settings.model }
    await save(next)
    settings = next
    if (choice.destination === 'local') prepareLocal()
    else local.stop()
    changed(state())
    return state()
  }

  const warm = async () => {
    if (settings.destination === 'local') await local.warm()
  }

  const inCloud = (file: string) => {
    const account = openai()
    if (!account) throw new Error(NO_KEY)
    return transcribeInCloud({ ...account, model: settings.model }, Bun.file(file))
  }

  const transcribeFile = (file: string) => {
    switch (settings.destination) {
      case 'off':
        throw new Error(OFF)
      case 'local':
        return local.transcribe(file)
      case 'cloud':
        return inCloud(file)
    }
  }

  const transcribe = async ({ transfer, chunks, size }: Upload) => {
    try {
      if (settings.destination === 'off') throw new Error(OFF)
      const file = await transfers.received(transfer, chunks, size)
      if (!file) throw new Error('The recording was empty')
      return { text: await transcribeFile(file) }
    } finally {
      await transfers.release(transfer)
    }
  }

  if (settings.destination === 'local') prepareLocal()

  return { state, use, warm, transcribe, stop: () => local.stop() }
}

export { createVoice, type Settings }
