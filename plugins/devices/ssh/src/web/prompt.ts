import type { Kit } from '@sand/ui-kit/contract'
import { shell } from '@sand/ui-shell/contract'
import { form, listen, preventThen, sig } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import type { SshPrompt } from '../contract'

type Answer = (value: string | null) => void

const confirmView = (kit: Kit, prompt: SshPrompt, answer: Answer) => {
  const { primaryAction, secondaryAction, sheetBody, sheetFoot, sheetText } = kit
  return [
    sheetBody({}, sheetText(prompt.text)),
    sheetFoot(secondaryAction({ type: 'button', onClick: () => answer('no') }, 'No'), primaryAction({ type: 'button', autofocus: true, onClick: () => answer('yes') }, 'Yes')),
  ]
}

const fieldView = (kit: Kit, prompt: SshPrompt, answer: Answer) => {
  const { field, primaryAction, secondaryAction, sheetBody, sheetFoot, textInput } = kit
  const value = sig('')
  return [
    form(
      { class: 'contents', onSubmit: preventThen(() => answer(value.get())) },
      sheetBody(
        {},
        field({ label: prompt.text }, textInput({ type: prompt.secret ? 'password' : 'text', bindValue: value, autofocus: true }, 'md')),
      ),
      sheetFoot(secondaryAction({ type: 'button', onClick: () => answer(null) }, 'Cancel'), primaryAction({ type: 'submit' }, 'Continue')),
    ),
  ]
}

export const askSheet = (ctx: Context, kit: Kit) => (prompt: SshPrompt, signal: AbortSignal) =>
  new Promise<string | null>(resolve => {
    const frame = ctx.get(shell)
    if (!frame) return resolve(null)
    const answer: Answer = value => {
      unlisten()
      sheet.close()
      resolve(value)
    }
    const close = () => answer(null)
    const body = prompt.confirm ? confirmView : fieldView
    const sheet = frame.sheet({ label: 'SSH', look: 'bare', size: 'sm', head: () => kit.sheetTitle('SSH'), body: () => body(kit, prompt, answer), onClose: close })
    const unlisten = listen(signal, 'abort', close, { once: true })
  })
