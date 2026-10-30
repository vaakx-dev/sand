import { pageLinkKeys } from '@sand/devices-contract'
import { div, keys, show, sig } from '@vaakx-dev/vrui'
import type { Ui } from '../ui'

const tokenOf = (text: string) => {
  try {
    const url = new URL(text.trim())
    const token = new URLSearchParams(url.hash.slice(1)).get(pageLinkKeys.pair)
    return token ? { url, token } : undefined
  } catch {
    return undefined
  }
}

const follow = (text: string) => {
  const found = tokenOf(text)
  if (!found) return false
  if (found.url.origin === location.origin) location.hash = `${pageLinkKeys.pair}=${encodeURIComponent(found.token)}`
  else location.assign(found.url.href)
  return true
}

export const pasteLink = (ui: Ui) => {
  const { errorText, secondaryAction, sheetText, textInput } = ui.kit
  const open = sig(false)
  const text = sig('')
  const wrong = sig(false)
  const submit = () => {
    const followed = follow(text.get())
    wrong.set(!followed)
    if (followed) text.set('')
  }
  return div(
    { class: 'flex flex-col gap-3' },
    div({ class: 'mb-1 h-px bg-neutral-700' }),
    div({ class: 'flex flex-wrap items-center gap-2' }, div({ class: 'min-w-0 flex-1' }, sheetText('Have a link?')), show(() => !open.get(), () => secondaryAction({ onClick: () => open.set(true) }, 'Paste it'))),
    show(open, () =>
      div(
        { class: 'flex flex-col gap-2' },
        div(
          { class: 'flex gap-2' },
          textInput({ placeholder: 'Paste the pairing link', 'aria-label': 'Pairing link', bindValue: text, autofocus: true, onInput: () => wrong.set(false), onKeyDown: keys({ Enter: submit }) }),
          secondaryAction({ disabled: () => !text.get().trim(), onClick: submit }, 'Pair'),
        ),
        show(wrong, () => errorText('That isn’t a pairing link. It ends in #pair=…')),
      ),
    ),
  )
}
