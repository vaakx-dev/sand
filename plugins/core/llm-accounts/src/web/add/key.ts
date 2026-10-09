import { div, keys, label, p, primaryAction, segmented, sig, textInput, toggleSwitch } from '@sand/dom'
import type { LoginProvider } from '../../contract'
import { busyAction } from '../parts'
import type { LoginControl } from '../state'

const providers: { value: LoginProvider; label: string; placeholder: string }[] = [
  { value: 'anthropic', label: 'Anthropic', placeholder: 'sk-ant-…' },
  { value: 'openai', label: 'OpenAI', placeholder: 'sk-…' },
]

export const keyStep = (control: LoginControl, saved: (provider: LoginProvider) => void) => {
  const provider = sig<LoginProvider>('anthropic')
  const key = sig('')
  const baseUrl = sig('')
  const share = sig(true)
  const busy = sig(false)
  const error = sig('')
  const ready = () => !busy.get() && !!key.get().trim()
  const account = () => control.state.get()?.accounts.find(found => found.provider === provider.get())

  const save = busyAction(busy, async () => {
    error.set('')
    await control.run({ type: 'login.key', provider: provider.get(), key: key.get().trim(), baseUrl: baseUrl.get().trim() })
    const after = account()
    if (!after?.signedIn || after.method !== 'api_key') return error.set(after?.error ?? 'The key was not saved')
    if (after.shared !== share.get()) await control.run({ type: 'login.shared', provider: provider.get(), shared: share.get() })
    saved(provider.get())
  })

  return div(
    { class: 'flex flex-col gap-4' },
    segmented(providers, provider, value => provider.set(value), { label: 'Provider', inset: true }),
    textInput({
      class: 'bg-neutral-900',
      type: 'password',
      placeholder: () => providers.find(entry => entry.value === provider.get())?.placeholder ?? 'API key',
      'aria-label': 'API key',
      bindValue: key,
      onKeyDown: keys({ Enter: () => ready() && void save() }),
    }),
    textInput({
      class: 'bg-neutral-900',
      type: 'url',
      placeholder: 'Base URL (optional)',
      'aria-label': 'Base URL',
      bindValue: baseUrl,
      onKeyDown: keys({ Enter: () => ready() && void save() }),
    }),
    p({ class: 'text-xs wrap-anywhere text-danger-400', hidden: () => !error.get() }, () => error.get()),
    div(
      { class: 'flex flex-wrap items-center justify-between gap-3' },
      label(
        { class: 'flex items-center gap-2 text-xs text-neutral-400' },
        toggleSwitch({ on: share, 'aria-label': 'Share with my PCs', onClick: () => share.set(!share.get()) }),
        'Share with my PCs',
      ),
      primaryAction({ disabled: () => !ready(), onClick: () => void save() }, 'Save'),
    ),
  )
}
