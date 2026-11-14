import type { Kit } from '@sand/ui-kit/contract'
import { errorMessage } from '@sand/util'
import { div, keys, sig } from '@vaakx-dev/vrui'
import { type CloudService, cloudServices, services } from '../../contract'
import type { VoiceModel } from '../model'

const cloudForm = (kit: Kit, model: VoiceModel, saved: () => void) => {
  const current = model.state.get()
  const start = current?.cloud ?? { service: 'openai' as const, ...services.openai }
  const service = sig<CloudService>(start.service)
  const url = sig(start.url)
  const name = sig(start.model)
  const key = sig('')
  const busy = sig(false)
  const error = sig('')

  const keySaved = () => Boolean(model.state.get()?.keys.includes(service.get()))
  const who = () => (service.get() === 'other' ? 'the service at that address' : services[service.get()].label)
  const ready = () => !busy.get() && Boolean(url.get().trim() && name.get().trim() && (key.get().trim() || keySaved()))

  const pick = (next: CloudService) => {
    service.set(next)
    url.set(services[next].url)
    name.set(services[next].model)
    key.set('')
  }

  const save = async () => {
    if (!ready()) return
    busy.set(true)
    error.set('')
    try {
      await model.use({ destination: 'cloud', service: service.get(), url: url.get().trim(), model: name.get().trim(), ...(key.get().trim() && { key: key.get().trim() }) })
      key.set('')
      saved()
    } catch (failure) {
      error.set(errorMessage(failure))
    } finally {
      busy.set(false)
    }
  }

  const submit = keys({ Enter: () => void save() })

  return kit.pageSection(
    { title: 'Cloud service', note: () => `Each recording goes to ${who()} when you stop speaking, and is billed to your account there.` },
    div(
      { class: 'flex flex-col gap-4' },
      kit.segmented(
        cloudServices.map(value => ({ value, label: services[value].label })),
        service,
        pick,
        { label: 'Service' },
      ),
      kit.field({ label: 'Address', hint: 'Any service that offers an OpenAI-style /audio/transcriptions endpoint' }, kit.textInput({ type: 'url', bindValue: url, placeholder: 'https://…/v1', onKeyDown: submit })),
      kit.field({ label: 'Model' }, kit.textInput({ bindValue: name, placeholder: 'whisper-1', onKeyDown: submit })),
      kit.field(
        { label: 'API key', error: () => error.get() || undefined },
        kit.textInput({ type: 'password', bindValue: key, placeholder: () => (keySaved() ? 'Saved. Enter a new one to replace it' : 'Paste your key'), onKeyDown: submit }),
      ),
      div({ class: 'flex' }, kit.primaryAction({ disabled: () => !ready(), onClick: () => void save() }, 'Save and use')),
    ),
  )
}

export { cloudForm }
