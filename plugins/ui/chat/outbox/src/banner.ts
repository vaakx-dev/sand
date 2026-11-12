import type { Kit } from '@sand/ui-kit/contract'
import type { OutboxItem } from '@sand/web-client/contract'
import { div, dynamicChild, list, show, span, type Sig } from '@vaakx-dev/vrui'
import type { OutboxModel } from './model'

const headline = ({ ready, busy, name }: OutboxModel) => {
  if (!ready.get()) return `Waiting for ${name.get()}. Sends when it’s back.`
  return busy.get().size ? `Sending to ${name.get()}…` : `Not sent to ${name.get()}`
}

const row = ({ errorText, quietButton, secondaryAction, spinner }: Kit, model: OutboxModel) => (item: Sig<OutboxItem>) => {
  const busy = () => model.busy.get().has(item.get().id)
  return div(
    { class: 'flex min-h-10 items-center gap-2' },
    div(
      { class: 'flex min-w-0 flex-1 flex-col' },
      span({ class: 'line-clamp-2 break-words' }, () => item.get().label),
      show(
        () => Boolean(item.get().error),
        () => errorText(() => `Couldn’t send: ${item.get().error}`),
      ),
    ),
    show(busy, () => spinner('md')),
    show(
      () => model.ready.get() && !busy(),
      () => secondaryAction({ onClick: () => void model.outbox.send(item.get().id) }, 'Send now'),
    ),
    show(
      () => !busy(),
      () => quietButton({ surface: 'raised', onClick: () => model.outbox.cancel(item.get().id) }, 'Cancel'),
    ),
  )
}

export const outboxBanner = (kit: Kit, model: OutboxModel) =>
  dynamicChild(model.ready, ready =>
    kit.banner(
      { tone: ready ? 'neutral' : 'warning', icon: 'clock', title: () => headline(model) },
      list(model.items, item => item.id, row(kit, model), div({ class: 'flex flex-col' })),
    ),
  )
