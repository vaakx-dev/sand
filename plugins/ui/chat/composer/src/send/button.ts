import type { MenuAction } from '@sand/ui-shell/contract'
import type { IconName, Kit, MenuSpec } from '@sand/ui-kit/contract'
import { oneLine } from '@sand/util'
import { derive, dynamicChild, SPACE, span, type Sig } from '@vaakx-dev/vrui'
import type { Model } from '../model'

type Look = 'off' | 'send' | 'steer' | 'stop' | 'busy'

const icons: Record<Exclude<Look, 'busy'>, IconName> = { off: 'up', send: 'up', steer: 'steer', stop: 'stop' }

const titles: Record<Look, string> = {
  off: 'Send',
  send: 'Send',
  steer: 'Add to the running turn',
  stop: 'Stop',
  busy: 'Sending',
}

const circle = `calc(${SPACE['6']} + ${SPACE['1']})`

const fill = 'bg-neutral-100 text-neutral-900'

const idle = `cursor-default opacity-40 ${fill}`

const tones: Record<Look, string> = {
  off: idle,
  busy: idle,
  send: fill,
  steer: fill,
  stop: fill,
}

const lookOf = (model: Model, sending: Sig<boolean>): Look => {
  if (sending.get()) return 'busy'
  const delivery = model.delivery.get()
  if (delivery === 'unreachable' || model.blocked.get() || model.holds.reason.get()) return 'off'
  if (model.empty.get()) return model.running.get() && delivery === 'now' ? 'stop' : 'off'
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
  if (look === 'busy' || model.delivery.get() === 'now') return titles[look]
  return `Send when ${model.pcName.get()} is back`
}

const glyphOf = (look: Look): IconName | 'busy' => (look === 'busy' ? 'busy' : icons[look])

const menuOf = (model: Model, actions: () => MenuAction[]): MenuSpec | undefined => {
  if (model.empty.get() || model.sending.get()) return undefined
  const shown = actions()
  if (!shown.length) return undefined
  return { title: oneLine(model.text.get(), 60) || 'Message', actions: shown }
}

export const sendControl = (kit: Kit, model: Model, actions: () => MenuAction[], aside: () => (() => void) | undefined) => {
  const { contextMenu, delayed, icon, plainButton, spinner } = kit
  const sending = delayed(model.sending)
  const look = derive(() => lookOf(model, sending))
  const glyph = derive(() => glyphOf(look.get()))
  const context = contextMenu()
  return span(
    { class: 'ml-1 inline-flex h-8 shrink-0 items-center' },
    plainButton(
      {
        title: () => titleOf(model, look.get()),
        'aria-label': () => (look.get() === 'off' ? titles.off : titleOf(model, look.get())),
        'aria-disabled': () => String(look.get() === 'off' || look.get() === 'busy'),
        class: ['inline-flex shrink-0 items-center justify-center rounded-full transition-colors', () => tones[look.get()]],
        style: { width: circle, height: circle },
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
      dynamicChild(glyph, value => (value === 'busy' ? spinner('sm') : icon(value, 14, value === 'stop'))),
    ),
    context.view(),
  )
}
