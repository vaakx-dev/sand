import type { Kit } from '@sand/ui-kit/contract'
import { errorMessage } from '@sand/util'
import { settingMark } from '@sand/settings/contract'
import { derive, div, dynamicChild, sig, span } from '@vaakx-dev/vrui'
import type { Destination } from '../../contract'
import type { VoiceModel } from '../model'
import { cloudForm } from './cloud'
import { localStatus } from './local'

const voiceItems = [{ id: 'voice-speech', label: 'Speech to text', keywords: ['microphone', 'mic', 'dictation', 'transcribe', 'whisper', 'openai'] }]

const voicePage = (kit: Kit, model: VoiceModel, openAccounts: () => void) => {
  model.refresh()
  const pending = sig<Destination | undefined>(undefined)
  const saved = derive(() => model.state.get()?.destination ?? 'off')
  const active = derive(() => pending.get() ?? saved.get())
  const error = sig('')

  const choose = async (destination: Destination) => {
    error.set('')
    if (destination === 'cloud') return pending.set('cloud')
    pending.set(undefined)
    await model.use({ destination }).catch((failure: unknown) => error.set(errorMessage(failure)))
  }

  const details = (destination: Destination) => {
    switch (destination) {
      case 'off':
        return null
      case 'local':
        return localStatus(kit, model, () => void choose('local'))
      case 'cloud':
        return cloudForm(kit, model, { saved: () => pending.set(undefined), accounts: openAccounts })
    }
  }

  return div(
    { class: 'flex flex-col gap-8' },
    kit.pageSection(
      { title: 'Speech to text', reset: { changed: () => saved.get() !== 'off', run: () => void choose('off') }, ...settingMark('voice-speech') },
      kit.choiceList(
        [
          { value: 'off' as const, label: 'Off (default)' },
          { value: 'local' as const, label: 'This PC', mark: span({ class: 'text-xs text-neutral-500' }, 'Free · private') },
          { value: 'cloud' as const, label: 'A cloud service', mark: span({ class: 'text-xs text-neutral-500' }, 'OpenAI key') },
        ],
        active,
        destination => void choose(destination),
        'Speech to text',
      ),
      kit.errorText(() => error.get()),
    ),
    dynamicChild(active, details),
  )
}

export { voiceItems, voicePage }
