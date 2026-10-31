import { div, keys, sig } from '@vaakx-dev/vrui'
import type { Shown } from '../shown'

export const replyBox = (shown: Shown) => {
  const { kit } = shown.parts
  const draft = sig('')
  const sending = sig(false)
  const send = async () => {
    const body = draft.get().trim()
    if (!body || sending.get()) return
    sending.set(true)
    const sent = await shown.actions.reply(body)
    sending.set(false)
    if (sent) draft.set('')
  }
  return div(
    { class: 'flex flex-col gap-2' },
    kit.textArea({ bindValue: draft, rows: 3, placeholder: 'Leave a comment', 'aria-label': 'Comment', disabled: sending, onKeyDown: keys({ 'mod+Enter': () => void send() }) }),
    div(
      { class: 'flex justify-end' },
      kit.secondaryAction({ size: 'sm', disabled: () => sending.get() || !draft.get().trim(), onClick: () => void send() }, () => (sending.get() ? 'Sending…' : 'Comment')),
    ),
  )
}
