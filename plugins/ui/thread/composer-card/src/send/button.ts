import type { FollowUpMode } from '@sand/web-client/contract'
import { delayed, derive, div, dropdown, dynamicChild, icon, iconButton, plainButton, popoverItem, show, span, spinner, type IconName, type Sig } from '@sand/dom'
import type { Model } from '../model'

type Look = 'off' | 'send' | 'queue' | 'steer' | 'save' | 'stop' | 'busy' | 'capture'

const icons: Record<Exclude<Look, 'busy' | 'capture'>, IconName> = { off: 'up', send: 'up', queue: 'queue', steer: 'steer', save: 'check', stop: 'stop' }

const titles: Record<Exclude<Look, 'capture'>, string> = {
  off: 'Send',
  send: 'Send',
  queue: 'Send after this turn',
  steer: 'Add to the running turn',
  save: 'Save changes',
  stop: 'Stop',
  busy: 'Sending',
}

const tone = (look: Look) => {
  if (look === 'busy') return 'cursor-default bg-neutral-700 text-neutral-500'
  if (look === 'off') return 'cursor-default bg-accent-950 text-accent-400'
  if (look === 'stop') return 'bg-danger-500 text-white hover:bg-danger-600'
  return 'bg-accent-500 text-neutral-950 hover:bg-accent-600'
}

const lookOf = (model: Model, sending: Sig<boolean>): Look => {
  if (sending.get()) return 'busy'
  if (!model.online.get() || model.blocked.get()) return 'off'
  if (model.capture.get()) return 'capture'
  if (model.editing.get()) return model.empty.get() ? 'off' : 'save'
  if (model.running.get()) return model.empty.get() ? 'stop' : model.mode.get()
  return model.empty.get() ? 'off' : 'send'
}

const offTitle = (model: Model) => {
  if (!model.online.get()) return 'Reconnecting to sand'
  if (model.loading.get()) return 'Reading attached files'
  return model.blocked.get() ? "Remove the files that can't be attached" : 'Send'
}

const titleOf = (model: Model, look: Look) => {
  if (look === 'capture') return model.capture.get()?.title() ?? 'Send'
  return look === 'off' ? offTitle(model) : titles[look]
}

const glyphOf = (model: Model, look: Look): IconName | 'busy' => {
  if (look === 'busy') return 'busy'
  return look === 'capture' ? (model.capture.get()?.icon() ?? 'up') : icons[look]
}

const option = (model: Model, close: () => void, value: FollowUpMode) =>
  popoverItem(
    {
      active: () => model.mode.get() === value,
      class: 'py-1',
      onClick: () => {
        model.mode.set(value)
        close()
      },
    },
    span({ class: 'inline-flex text-neutral-500' }, icon(icons[value], 16)),
    span({ class: 'min-w-0 flex-1 text-sm text-neutral-100' }, titles[value]),
    show(
      () => model.mode.get() === value,
      () => span({ class: 'inline-flex text-accent-400' }, icon('check', 14)),
    ),
  )

const modeMenu = (model: Model) =>
  dropdown({
    placement: 'above-right',
    keepFocus: true,
    menuClass: 'w-64',
    trigger: (press, open) => iconButton({ size: 'sm', title: 'Send options', active: open, ...press }, icon('down', 14)),
    items: close => [option(model, close, 'queue'), option(model, close, 'steer')],
  })

export const sendControl = (model: Model) => {
  const sending = delayed(model.sending)
  const look = derive(() => lookOf(model, sending))
  const glyph = derive(() => glyphOf(model, look.get()))
  const split = derive(() => model.running.get() && !model.empty.get() && !model.editing.get() && !model.capture.get())
  return div(
    { class: 'ml-1 flex shrink-0 items-center gap-1' },
    show(split, () => modeMenu(model)),
    plainButton(
      {
        title: () => titleOf(model, look.get()),
        'aria-label': () => (look.get() === 'off' ? titles.off : titleOf(model, look.get())),
        class: ['inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors', () => tone(look.get())],
        onClick: () => void model.send(),
      },
      dynamicChild(glyph, value => (value === 'busy' ? spinner(16) : icon(value, value === 'stop' ? 12 : 16))),
    ),
  )
}
