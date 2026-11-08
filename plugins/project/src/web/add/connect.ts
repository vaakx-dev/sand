import type { SshHost, SshMachines, SshPrompt } from '@sand/devices-ssh/contract'
import { errorMessage } from '@sand/util'
import { div, dynamicChild, form, label, preventThen, registerInScope, sig } from '@vaakx-dev/vrui'
import type { ProjectsContext } from '../context'
import type { Step } from './run'

type Asking = { prompt: SshPrompt; answer: (value: string | null) => void }

const promptView = (ctx: ProjectsContext, { prompt, answer }: Asking) => {
  const { primaryAction, secondaryAction, sheetText, textInput } = ctx.kit
  if (prompt.confirm) {
    return div(
      { class: 'flex flex-col gap-3' },
      sheetText(prompt.text),
      div(
        { class: 'flex justify-end gap-2' },
        secondaryAction({ type: 'button', onClick: () => answer(null) }, 'No'),
        primaryAction({ type: 'button', autofocus: true, onClick: () => answer('yes') }, 'Yes'),
      ),
    )
  }
  const value = sig('')
  return form(
    { class: 'flex flex-col gap-3', onSubmit: preventThen(() => answer(value.get())) },
    label({ class: 'flex flex-col gap-2' }, sheetText(prompt.text), textInput({ type: prompt.secret ? 'password' : 'text', bindValue: value, autofocus: true }, 'md')),
    div(
      { class: 'flex justify-end gap-2' },
      secondaryAction({ type: 'button', onClick: () => answer(null) }, 'Cancel'),
      primaryAction({ type: 'submit' }, 'Continue'),
    ),
  )
}

export const connectStep = (ctx: ProjectsContext, machines: SshMachines, host: SshHost, done: (device: string) => void, failed: (message: string) => void): Step => {
  const { sheetText, spinner } = ctx.kit
  const lines = sig<string[]>([])
  const asking = sig<Asking | undefined>(undefined)
  const controller = new AbortController()
  registerInScope(() => controller.abort())
  const ask = (prompt: SshPrompt) =>
    new Promise<string | null>(resolve => {
      asking.set({
        prompt,
        answer: value => {
          asking.set(undefined)
          resolve(value)
        },
      })
    })
  void machines.connect(host.id, { progress: text => lines.update(list => [...list, text]), ask, signal: controller.signal }).then(
    device => controller.signal.aborted || done(device),
    (error: unknown) => controller.signal.aborted || failed(errorMessage(error)),
  )
  return {
    body: div(
      { class: 'flex flex-col gap-4' },
      div(
        { class: 'flex flex-col gap-1' },
        dynamicChild(lines, list => div({ class: 'flex flex-col gap-1' }, ...list.map(line => sheetText(line)))),
        dynamicChild(asking, current => (current ? null : div({ class: 'flex items-center gap-2' }, spinner(), sheetText('Connecting…')))),
      ),
      dynamicChild(asking, current => (current ? promptView(ctx, current) : null)),
    ),
  }
}
