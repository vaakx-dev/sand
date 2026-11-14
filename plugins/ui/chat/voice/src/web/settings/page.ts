import type { Kit } from '@sand/ui-kit/contract'
import { errorMessage } from '@sand/util'
import { derive, div, dynamicChild, p, sig, span } from '@vaakx-dev/vrui'
import { type Destination, localModel } from '../../contract'
import type { VoiceModel } from '../model'
import { cloudForm } from './cloud'
import { localStatus } from './local'

const NOTES: Record<Destination, string> = {
  off: 'Nothing is recorded. The microphone in the message box brings you here.',
  local: `${localModel.name} turns your speech into ${localModel.language} text on this PC, on its graphics card when it has one. Free, and your audio never leaves the PC.`,
  cloud: 'Your recordings go to the service you pick and are billed to your account there.',
}

const voicePage = (kit: Kit, model: VoiceModel) => {
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
        return cloudForm(kit, model, () => pending.set(undefined))
    }
  }

  return div(
    { class: 'flex flex-col gap-8' },
    kit.pageSection(
      { title: 'Turn speech into text', note: 'Where the words you say into the microphone become text. They land in your message for you to check, and are never sent on their own.' },
      kit.choiceList(
        [
          { value: 'off' as const, label: 'Off' },
          { value: 'local' as const, label: 'This PC', mark: span({ class: 'text-xs text-neutral-500' }, 'Free · private') },
          { value: 'cloud' as const, label: 'A cloud service', mark: span({ class: 'text-xs text-neutral-500' }, 'Your key') },
        ],
        active,
        destination => void choose(destination),
        'Turn speech into text',
      ),
      p({ class: 'mt-3 text-xs text-neutral-500' }, () => NOTES[active.get()]),
      kit.errorText(() => error.get()),
    ),
    dynamicChild(active, details),
  )
}

export { voicePage }
