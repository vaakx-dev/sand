import type { IconName, Kit, MenuSpec } from '@sand/ui-kit/contract'
import { oneLine } from '@sand/util'
import { derive, dynamicChild, span, type Sig } from '@vaakx-dev/vrui'
import type { Model } from '../model'
import type { SendMenu } from './menu'

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
  if (!model.online.get() || model.blocked.get()) return 'off'
  if (model.running.get()) return model.empty.get() ? 'stop' : 'steer'
  return model.empty.get() ? 'off' : 'send'
}

const offTitle = (model: Model) => {
  if (!model.online.get()) return 'Reconnecting to sand'
  if (model.loading.get()) return 'Reading attached files'
  return model.blocked.get() ? "Remove the files that can't be attached" : 'Send'
}

const titleOf = (model: Model, look: Look) => (look === 'off' ? offTitle(model) : titles[look])

const glyphOf = (look: Look): IconName | 'busy' => (look === 'busy' ? 'busy' : icons[look])

const menuOf = (model: Model, menu: SendMenu): MenuSpec | undefined => {
  const actions = menu.actions.get()
  if (!actions.length || model.empty.get() || model.sending.get()) return undefined
  return { title: oneLine(model.text.get(), 60) || 'Message', actions }
}

export const sendControl = (kit: Kit, model: Model, menu: SendMenu) => {
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
          () => menuOf(model, menu),
          () => void model.send(),
        ),
      },
      dynamicChild(glyph, value => (value === 'busy' ? spinner('md') : icon(value, 'md', value === 'stop'))),
    ),
    context.view(),
  )
}
