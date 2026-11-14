import type { Transfers } from '@sand/transfers/contract'
import { mkdir } from 'node:fs/promises'
import type { Choice, Cloud, VoiceState } from '../contract'
import { Choices } from './choices'
import { transcribeInCloud } from './cloud'
import { LocalSpeech } from './local/speech'
import type { Source } from './local/download'

interface VoiceOptions {
  folder: string
  transfers: Transfers
  changed(state: VoiceState): void
  model?: Source
}

interface Upload {
  transfer: string
  chunks: number
  size: number
}

const OFF = 'Voice is off. Choose where your speech is turned into text in Settings › Voice.'

const createVoice = async ({ folder, transfers, changed, model }: VoiceOptions) => {
  await mkdir(folder, { recursive: true })
  const choices = await Choices.open(folder)

  const state = (): VoiceState => {
    const { destination, cloud } = choices.saved()
    return { destination, local: local.status(), ...(cloud && { cloud }), keys: choices.keys() }
  }

  const local = await LocalSpeech.open(folder, () => changed(state()), model)

  const prepareLocal = () => {
    if (local.status().status !== 'ready') void local.prepare()
  }

  const use = async (choice: Choice) => {
    await choices.choose(choice)
    if (choice.destination === 'local') prepareLocal()
    else local.stop()
    changed(state())
    return state()
  }

  const warm = async () => {
    if (choices.saved().destination === 'local') await local.warm()
  }

  const inCloud = (cloud: Cloud | undefined, file: string) => {
    const key = cloud && choices.key(cloud.service)
    if (!cloud || !key) throw new Error('Add your key for the speech service in Settings › Voice.')
    return transcribeInCloud(cloud, key, Bun.file(file))
  }

  const transcribeFile = (file: string) => {
    const { destination, cloud } = choices.saved()
    switch (destination) {
      case 'off':
        throw new Error(OFF)
      case 'local':
        return local.transcribe(file)
      case 'cloud':
        return inCloud(cloud, file)
    }
  }

  const transcribe = async ({ transfer, chunks, size }: Upload) => {
    try {
      if (choices.saved().destination === 'off') throw new Error(OFF)
      const file = await transfers.received(transfer, chunks, size)
      if (!file) throw new Error('The recording was empty')
      return { text: await transcribeFile(file) }
    } finally {
      await transfers.release(transfer)
    }
  }

  if (choices.saved().destination === 'local') prepareLocal()

  return { state, use, warm, transcribe, stop: () => local.stop() }
}

export { createVoice }
