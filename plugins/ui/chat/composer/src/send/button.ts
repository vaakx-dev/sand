import type { NavAction } from '@sand/nav/contract'
import type { IconName, Kit, MenuSpec } from '@sand/ui-kit/contract'
import { oneLine } from '@sand/util'
import { derive, dynamicChild, span, type Sig } from '@vaakx-dev/vrui'
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

const tone = (kit: Kit, look: Look) => {
  const { actionTones } = kit
  if (look === 'busy' || look === 'off') return 'cursor-default bg-neutral-700/60 text-neutral-500'
  return look === 'stop' ? actionTones.secondary : actionTones.primary
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

const menuOf = (model: Model, actions: () => NavAction[]): MenuSpec | undefined => {
  if (model.empty.get() || model.sending.get()) return undefined
  const shown = actions()
  if (!shown.length) return undefined
  return { title: oneLine(model.text.get(), 60) || 'Message', actions: shown }
}

export const sendControl = (kit: Kit, model: Model, actions: () => NavAction[]) => {
  const { contextMenu, delayed, icon, plainButton, spinner } = kit
  const sending = delayed(model.sending)
  const look = derive(() => lookOf(model, sending))
  const glyph = derive(() => glyphOf(look.get()))
  const context = contextMenu()
  return span(
    { class: 'ml-1 inline-flex shrink-0' },
    plainButton(
      {
        title: () => titleOf(model, look.get()),
        'aria-label': () => (look.get() === 'off' ? titles.off : titleOf(model, look.get())),
        'aria-disabled': () => String(look.get() === 'off' || look.get() === 'busy'),
        class: ['inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors', () => tone(kit, look.get())],
        ...context.target(
          () => menuOf(model, actions),
          () => void model.send(),
        ),
      },
      dynamicChild(glyph, value => (value === 'busy' ? spinner('md') : icon(value, 'md', value === 'stop'))),
    ),
    context.view(),
  )
}
