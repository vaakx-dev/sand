import type { Kit } from '@sand/ui-kit/contract'
import { place } from '@sand/ui-shell/contract'
import { form, label, listen, preventThen, sig } from '@vaakx-dev/vrui'
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
  const { primaryAction, secondaryAction, sheetBody, sheetFoot, sheetText, textInput } = kit
  const value = sig('')
  return [
    form(
      { class: 'contents', onSubmit: preventThen(() => answer(value.get())) },
      sheetBody(
        {},
        label({ class: 'flex flex-col gap-2' }, sheetText(prompt.text), textInput({ type: prompt.secret ? 'password' : 'text', bindValue: value, autofocus: true }, 'md')),
      ),
      sheetFoot(secondaryAction({ type: 'button', onClick: () => answer(null) }, 'Cancel'), primaryAction({ type: 'submit' }, 'Continue')),
    ),
  ]
}

export const askSheet = (ctx: Context, kit: Kit) => (prompt: SshPrompt, signal: AbortSignal) =>
  new Promise<string | null>(resolve => {
    const answer: Answer = value => {
      unlisten()
      void unplace()
      resolve(value)
    }
    const close = () => answer(null)
    const body = prompt.confirm ? confirmView : fieldView
    const view = () => kit.overlay(close, kit.sheet({ size: 'sm', 'aria-label': 'SSH' }, kit.sheetHead({ title: 'SSH', close }), ...body(kit, prompt, answer)))
    const unplace = place(ctx, 'overlay', view)
    const unlisten = listen(signal, 'abort', close, { once: true })
  })
