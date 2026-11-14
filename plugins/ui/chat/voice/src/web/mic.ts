import type { ComposerView } from '@sand/composer/contract'
import type { Toasts } from '@sand/toasts/contract'
import type { IconName, Kit } from '@sand/ui-kit/contract'
import { errorMessage, percent } from '@sand/util'
import { derive, dynamicChild, onTimeout, show, sig, span } from '@vaakx-dev/vrui'
import { maxRecordingMs, type VoiceState } from '../contract'
import type { VoiceModel } from './model'
import { canRecord, record, type Recording } from './recorder'

interface MicParts {
  kit: Kit
  model: VoiceModel
  here: ComposerView
  toasts: Toasts
  openSettings(): void
}

type Phase = 'idle' | 'recording' | 'transcribing'

type Look = 'blocked' | 'setup' | 'preparing' | 'ready' | 'recording' | 'transcribing'

const NEEDS_HTTPS = 'Voice needs a secure address. Open sand over HTTPS, such as Tailscale HTTPS from the Devices page.'

const NO_MICROPHONE = "sand can't use your microphone. Allow it for this site in your browser, then try again."

const PREPARING = new Set(['installing', 'downloading', 'checking'])

const glyphs: Record<Look, IconName | 'busy'> = {
  blocked: 'mic-off',
  setup: 'mic',
  preparing: 'busy',
  ready: 'mic',
  recording: 'stop',
  transcribing: 'busy',
}

const tones: Record<Look, string> = {
  blocked: 'text-neutral-500',
  setup: 'text-neutral-400 hover:text-neutral-100',
  preparing: 'text-neutral-400',
  ready: 'text-neutral-400 hover:text-neutral-100',
  recording: 'bg-danger-500 text-white hover:bg-danger-400',
  transcribing: 'text-neutral-400',
}

const waitingTitle = (state: VoiceState | undefined) => {
  if (!state || state.destination === 'off') return 'Set up voice input'
  if (state.destination === 'cloud') return 'Add an OpenAI API key in Settings › Accounts'
  const local = state.local
  switch (local.status) {
    case 'downloading':
      return `Downloading the speech model… ${percent(local.done / local.total)}`
    case 'failed':
    case 'unsupported':
      return local.message
    case 'missing':
      return 'Set up voice input'
    default:
      return 'Getting the speech model ready…'
  }
}

const lookOf = (phase: Phase, state: VoiceState | undefined, ready: boolean): Look => {
  if (!canRecord()) return 'blocked'
  if (phase !== 'idle') return phase
  if (ready) return 'ready'
  return state?.destination === 'local' && PREPARING.has(state.local.status) ? 'preparing' : 'setup'
}

const titleOf = (look: Look, state: VoiceState | undefined) => {
  switch (look) {
    case 'blocked':
      return NEEDS_HTTPS
    case 'ready':
      return 'Dictate'
    case 'recording':
      return 'Stop and add the words'
    case 'transcribing':
      return 'Turning speech into text…'
    default:
      return waitingTitle(state)
  }
}

const glyph = (kit: Kit, name: IconName | 'busy') => (name === 'busy' ? kit.spinner('md') : kit.icon(name, name === 'stop' ? 14 : 'md', name === 'stop'))

const isDenied = (error: unknown) => error instanceof DOMException && (error.name === 'NotAllowedError' || error.name === 'SecurityError')

const micButton = ({ kit, model, here, toasts, openSettings }: MicParts) => {
  const phase = sig<Phase>('idle')
  const since = sig<number | undefined>(undefined)
  const look = derive(() => lookOf(phase.get(), model.state.get(), model.ready.get()))
  let recording: Recording | undefined
  let stopLimit: (() => void) | undefined

  const reset = () => {
    stopLimit?.()
    recording = undefined
    since.set(undefined)
    phase.set('idle')
  }

  const words = async (taken: Recording) => {
    const text = await model.transcribe(await taken.finish())
    if (text) here.insertWords(text)
    else toasts.show({ tone: 'neutral', title: 'No words heard', detail: 'Try again a little closer to the microphone.' })
  }

  const finish = async () => {
    const taken = recording
    if (!taken) return
    stopLimit?.()
    phase.set('transcribing')
    await toasts.attempt("Couldn't turn your speech into text", () => words(taken))
    reset()
  }

  const start = async () => {
    try {
      recording = await record()
    } catch (error) {
      toasts.show(isDenied(error) ? { tone: 'warning', title: NO_MICROPHONE } : { tone: 'warning', title: "Couldn't start the microphone", detail: errorMessage(error) })
      return
    }
    phase.set('recording')
    since.set(Date.now())
    stopLimit = onTimeout(() => void finish(), maxRecordingMs)
    void model.warm().catch(() => undefined)
  }

  const cancel = () => {
    recording?.cancel()
    reset()
  }

  const press = () => {
    switch (look.get()) {
      case 'blocked':
        return void toasts.show({ tone: 'warning', title: NEEDS_HTTPS })
      case 'ready':
        return void start()
      case 'recording':
        return void finish()
      case 'transcribing':
        return
      default:
        return openSettings()
    }
  }

  const recordingNow = () => phase.get() === 'recording'

  return span(
    { class: 'inline-flex items-center gap-1', onMount: () => cancel },
    show(recordingNow, () =>
      span(
        { class: 'inline-flex items-center gap-1 text-xs text-neutral-400' },
        kit.elapsed(since),
        kit.iconButton({ size: 'sm', title: 'Cancel', 'aria-label': 'Cancel dictation', onClick: cancel }, kit.icon('x', 'sm')),
      ),
    ),
    kit.roundButton(
      {
        title: () => titleOf(look.get(), model.state.get()),
        'aria-label': () => titleOf(look.get(), model.state.get()),
        'aria-pressed': () => String(recordingNow()),
        'data-voice': () => look.get(),
        class: () => tones[look.get()],
        onClick: press,
      },
      dynamicChild(look, current => glyph(kit, glyphs[current])),
    ),
  )
}

export { micButton }
