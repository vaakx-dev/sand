import type { Kit } from '@sand/ui-kit/contract'
import { keys, label, sig } from '@vaakx-dev/vrui'
import type { KeyKind } from '../../contract'
import { problem, whileBusy } from '../parts'
import type { LoginControl } from '../state'

export const keyNames: Record<KeyKind, string> = { anthropic: 'Anthropic', openai: 'OpenAI', openrouter: 'OpenRouter' }

const placeholders: Record<KeyKind, string> = { anthropic: 'sk-ant-…', openai: 'sk-…', openrouter: 'sk-or-…' }

const takesBaseUrl = (kind: KeyKind) => kind !== 'openrouter'

export const keyStep = (kit: Kit, control: LoginControl, kind: KeyKind, saved: () => void) => {
  const { primaryAction, sheetStep, textInput, toggleSwitch } = kit
  const key = sig('')
  const baseUrl = sig('')
  const share = sig(true)
  const busy = sig(false)
  const error = sig('')
  const ready = () => !busy.get() && !!key.get().trim()

  const save = () =>
    whileBusy(busy, async () => {
      error.set('')
      await control.run({ type: 'login.key', account: kind, key: key.get().trim(), ...(takesBaseUrl(kind) && { baseUrl: baseUrl.get().trim() }) })
      const after = control.account(kind)
      if (!after?.signedIn || after.method !== 'api_key') return error.set(after?.error ?? 'The key was not saved')
      if (after.shared !== share.get()) await control.run({ type: 'login.shared', account: kind, shared: share.get() })
      saved()
    })

  const submit = () => {
    if (ready()) void save()
  }

  return sheetStep(
    [
      textInput({
        type: 'password',
        placeholder: placeholders[kind],
        'aria-label': `${keyNames[kind]} API key`,
        bindValue: key,
        onKeyDown: keys({ Enter: submit }),
        onMount: node => node.focus(),
      }),
      takesBaseUrl(kind) ? textInput({ type: 'url', placeholder: 'Base URL (optional)', 'aria-label': 'Base URL', bindValue: baseUrl, onKeyDown: keys({ Enter: submit }) }) : null,
      problem(kit, () => error.get()),
      label({ class: 'flex items-center gap-2 text-xs text-neutral-400' }, toggleSwitch({ on: share, 'aria-label': 'Share with my PCs', onClick: share.toggle() }), 'Share with my PCs'),
    ],
    primaryAction({ disabled: () => !ready(), onClick: submit }, 'Save'),
  )
}
