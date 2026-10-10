import { div, keys, label, primaryAction, sig, textInput, toggleSwitch } from '@sand/dom'
import type { KeyKind } from '../../contract'
import { busyAction, problem } from '../parts'
import type { LoginControl } from '../state'

export const keyNames: Record<KeyKind, string> = { anthropic: 'Anthropic', openai: 'OpenAI', openrouter: 'OpenRouter' }

const placeholders: Record<KeyKind, string> = { anthropic: 'sk-ant-…', openai: 'sk-…', openrouter: 'sk-or-…' }

const takesBaseUrl = (kind: KeyKind) => kind !== 'openrouter'

export const keyStep = (control: LoginControl, kind: KeyKind, saved: () => void) => {
  const key = sig('')
  const baseUrl = sig('')
  const share = sig(true)
  const busy = sig(false)
  const error = sig('')
  const ready = () => !busy.get() && !!key.get().trim()
  const onEnter = keys({ Enter: () => ready() && void save() })

  const save = busyAction(busy, async () => {
    error.set('')
    await control.run({ type: 'login.key', account: kind, key: key.get().trim(), ...(takesBaseUrl(kind) && { baseUrl: baseUrl.get().trim() }) })
    const after = control.account(kind)
    if (!after?.signedIn || after.method !== 'api_key') return error.set(after?.error ?? 'The key was not saved')
    if (after.shared !== share.get()) await control.run({ type: 'login.shared', account: kind, shared: share.get() })
    saved()
  })

  return div(
    { class: 'flex flex-col gap-4' },
    textInput({
      class: 'bg-neutral-900',
      type: 'password',
      placeholder: placeholders[kind],
      'aria-label': `${keyNames[kind]} API key`,
      bindValue: key,
      onKeyDown: onEnter,
      onMount: node => node.focus(),
    }),
    takesBaseUrl(kind)
      ? textInput({ class: 'bg-neutral-900', type: 'url', placeholder: 'Base URL (optional)', 'aria-label': 'Base URL', bindValue: baseUrl, onKeyDown: onEnter })
      : null,
    problem(() => error.get()),
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
