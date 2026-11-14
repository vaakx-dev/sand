import type { MenuAction } from '@sand/ui-shell/contract'
import type { IconName, Kit, MenuSpec } from '@sand/ui-kit/contract'
import { oneLine } from '@sand/util'
import { derive, dynamicChild, span } from '@vaakx-dev/vrui'
import type { Model } from '../model'

type Look = 'off' | 'send' | 'steer' | 'stop'

const icons: Record<Look, IconName> = { off: 'up', send: 'up', steer: 'steer', stop: 'stop' }

const titles: Record<Look, string> = {
  off: 'Send',
  send: 'Send',
  steer: 'Add to the running turn',
  stop: 'Stop',
}

const fill = 'bg-neutral-100 text-neutral-900'

const idle = `cursor-default opacity-40 ${fill}`

const tones: Record<Look, string> = {
  off: idle,
  send: fill,
  steer: fill,
  stop: fill,
}

const lookOf = (model: Model): Look => {
  const delivery = model.delivery.get()
  if (delivery === 'unreachable' || model.blocked.get() || model.holds.reason.get()) return 'off'
  if (model.empty.get()) return model.stoppable.get() && delivery === 'now' ? 'stop' : 'off'
  return model.running.get() ? 'steer' : 'send'
}

const offTitle = (model: Model) => {
  const held = model.holds.reason.get()
  if (held) return held
  if (model.delivery.get() === 'unreachable') return `Reconnecting to ${model.pcName.get()}`
  return model.blocked.get() ? "Remove the files that can't be attached" : 'Send'
}

const titleOf = (model: Model, look: Look) => {
  if (look === 'off') return offTitle(model)
  if (model.delivery.get() === 'now') return titles[look]
  return `Send when ${model.pcName.get()} is back`
}

const menuOf = (model: Model, actions: () => MenuAction[]): MenuSpec | undefined => {
  if (model.empty.get()) return undefined
  const shown = actions()
  if (!shown.length) return undefined
  return { title: oneLine(model.text.get(), 60) || 'Message', actions: shown }
}

export const sendControl = (kit: Kit, model: Model, actions: () => MenuAction[], aside: () => (() => void) | undefined) => {
  const { contextMenu, icon, roundButton } = kit
  const look = derive(() => lookOf(model))
  const context = contextMenu()
  return span(
    { class: 'ml-1 inline-flex h-8 shrink-0 items-center' },
    roundButton(
      {
        title: () => titleOf(model, look.get()),
        'aria-label': () => (look.get() === 'off' ? titles.off : titleOf(model, look.get())),
        'aria-disabled': () => String(look.get() === 'off'),
        class: () => tones[look.get()],
        ...context.target(
          ({ touch }) => {
            const found = touch && !model.empty.get() ? aside() : undefined
            if (!found) return menuOf(model, actions)
            found()
            return undefined
          },
          () => void model.send(),
        ),
      },
      dynamicChild(look, value => icon(icons[value], 14, value === 'stop')),
    ),
    context.view(),
  )
}
