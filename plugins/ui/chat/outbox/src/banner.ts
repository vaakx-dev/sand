import type { Kit } from '@sand/ui-kit/contract'
import type { OutboxItem } from '@sand/web-client/contract'
import { div, list, show, span, type Sig } from '@vaakx-dev/vrui'
import type { OutboxModel } from './model'

const headline = ({ ready, busy, name }: OutboxModel) => {
  if (!ready.get()) return `Waiting for ${name.get()}. Sends when it’s back.`
  return busy.get().size ? `Sending to ${name.get()}…` : `Not sent to ${name.get()}`
}

const row = ({ quietButton, secondaryAction, spinner }: Kit, model: OutboxModel) => (item: Sig<OutboxItem>) => {
  const busy = () => model.busy.get().has(item.get().id)
  return div(
    { class: 'flex min-h-10 items-center gap-2' },
    div(
      { class: 'flex min-w-0 flex-1 flex-col' },
      span({ class: 'line-clamp-2 break-words' }, () => item.get().label),
      show(
        () => Boolean(item.get().error),
        () => span({ class: 'text-xs text-danger-400' }, () => `Couldn’t send: ${item.get().error}`),
      ),
    ),
    show(busy, () => spinner('md')),
    show(
      () => model.ready.get() && !busy(),
      () => secondaryAction({ onClick: () => void model.outbox.send(item.get().id) }, 'Send now'),
    ),
    show(
      () => !busy(),
      () => quietButton({ onClick: () => model.outbox.cancel(item.get().id) }, 'Cancel'),
    ),
  )
}

export const outboxBanner = (kit: Kit, model: OutboxModel) =>
  div(
    { role: 'status', class: 'flex flex-col' },
    div(
      { class: 'flex min-h-6 items-start gap-2' },
      span({ class: ['inline-flex h-6 shrink-0 items-center', () => (model.ready.get() ? 'text-neutral-400' : 'text-warning-400')] }, kit.icon('clock', 'md')),
      span({ class: 'min-w-0 flex-1 leading-6' }, () => headline(model)),
    ),
    list(model.items, item => item.id, row(kit, model), div({ class: 'flex flex-col pl-6' })),
  )
