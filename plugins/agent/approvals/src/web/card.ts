import type { Kit } from '@sand/ui-kit/contract'
import { errorMessage } from '@sand/util'
import { type Child, type Derive, div, dynamicChild, list, sig, span } from '@vaakx-dev/vrui'
import type { Answer } from '../contract'
import type { Model, Waiting } from './model'

const scopes = { thread: 'this thread', bot: 'this bot' }

export const approvalCard = (kit: Kit, model: Model, item: Waiting, where?: Child) => {
  const { errorText, icon, primaryAction, quietButton, secondaryAction } = kit
  const { decision } = item
  const busy = sig(false)
  const failure = sig('')
  const send = (answer: Answer) => {
    busy.set(true)
    failure.set('')
    model.answer(item, answer).catch(error => {
      failure.set(errorMessage(error))
      busy.set(false)
    })
  }
  return div(
    { class: 'flex flex-col gap-2' },
    where ?? null,
    div(
      { class: 'flex min-w-0 items-center gap-2 text-neutral-100' },
      icon('shield', 'sm'),
      span({ class: 'min-w-0 truncate text-sm font-medium' }, `Allow ${decision.tool}?`),
    ),
    div({ class: 'line-clamp-4 text-sm whitespace-pre-wrap wrap-anywhere text-neutral-400' }, decision.summary),
    dynamicChild(failure, text => (text ? errorText(text) : null)),
    div(
      { class: 'flex flex-wrap justify-end gap-2' },
      quietButton({ size: 'sm', disabled: busy, onClick: () => send('deny') }, 'Deny'),
      secondaryAction(
        { size: 'sm', disabled: busy, title: `Allow ${decision.tool} in ${scopes[decision.owner]} from now on`, onClick: () => send('always') },
        'Always allow',
      ),
      primaryAction({ size: 'sm', disabled: busy, onClick: () => send('once') }, 'Allow once'),
    ),
  )
}

export const approvalCards = (kit: Kit, model: Model, items: Derive<Waiting[]>, item: string, container: HTMLElement) =>
  list(
    items,
    found => found.decision.id,
    found => div({ class: item }, approvalCard(kit, model, found.get())),
    container,
  )
