import { type Wire, wireHello } from '@sand/devices-contract'
import { uploadBlob } from '@sand/transfers/contract'
import { derive, sig } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import { type Choice, helloVoice, voiceChanged, voiceState, voiceTranscribe, voiceUse, voiceWarm, type VoiceState } from '../contract'

const voiceModel = (ctx: Context, wire: Wire) => {
  const state = sig<VoiceState | undefined>(undefined)
  const take = (next: VoiceState | undefined) => {
    if (next) state.set(next)
  }
  const hello = () => take(wire.hello(helloVoice))
  ctx.on(wireHello, hello)
  if (wire.ready()) hello()
  ctx.effect(() => wire.on(voiceChanged, take))

  const ready = derive(() => {
    const current = state.get()
    if (current?.destination === 'cloud') return Boolean(current.openai)
    return current?.destination === 'local' && current.local.status === 'ready'
  })

  const transcribe = async (speech: Blob) => {
    const uploaded = await uploadBlob((path, init) => wire.fetch(path, init), speech)
    return (await wire.call(voiceTranscribe, uploaded)).text
  }

  return {
    state,
    ready,
    refresh: () => void wire.call(voiceState, {}).then(take, error => ctx.report(error)),
    use: async (choice: Choice) => take(await wire.call(voiceUse, choice)),
    warm: () => wire.call(voiceWarm, {}),
    transcribe,
  }
}

type VoiceModel = ReturnType<typeof voiceModel>

export { voiceModel, type VoiceModel }
