import type { Kit } from '@sand/ui-kit/contract'
import { div, form, preventThen, sig, span } from '@vaakx-dev/vrui'
import { secretMinLength } from '../../names'
import type { SecretAsk } from './pending'

export type SendSecret = (value: string | null) => Promise<boolean>

export const secretCard = (kit: Kit, ask: SecretAsk, send: SendSecret) => {
  const { bannerTitle, icon, note, primaryAction, quietButton, textInput } = kit
  const value = sig('')
  const sending = sig(false)

  const answer = async (given: string | null) => {
    sending.set(true)
    const sent = await send(given)
    sending.set(false)
    if (sent) value.set('')
  }

  return form(
    {
      class: 'flex flex-col gap-2 rounded-lg bg-accent-950 px-3 py-3 text-sm text-neutral-300 ring-1 ring-accent-800 animate-fade',
      'aria-label': `sand asks for ${ask.name}`,
      onSubmit: preventThen(() => void answer(value.get())),
    },
    div({ class: 'flex min-w-0 items-center gap-2' }, span({ class: 'inline-flex shrink-0 text-accent-400' }, icon('key', 14)), bannerTitle(`sand asks for ${ask.name}`)),
    ask.reason ? div({ class: 'wrap-anywhere' }, ask.reason) : null,
    div(
      { class: 'flex items-center gap-2' },
      textInput({ type: 'password', bindValue: value, placeholder: 'Paste the value', 'aria-label': ask.name, disabled: sending }),
      primaryAction({ type: 'submit', disabled: () => value.get().length < secretMinLength || sending.get() }, 'Save'),
      quietButton({ disabled: sending, onClick: () => void answer(null) }, 'Skip'),
    ),
    note(`At least ${secretMinLength} characters. Kept in memory for this thread only and given to its shell commands as ${ask.name}. The agent never sees it.`),
  )
}
