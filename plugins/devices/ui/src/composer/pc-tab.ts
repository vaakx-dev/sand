import { composer } from '@sand/composer/contract'
import type { PcView } from '@sand/devices-contract'
import { projects, threads } from '@sand/web-client/contract'
import { derive, div, dynamicChild, show, sig, SPACE, span } from '@vaakx-dev/vrui'
import { toneDot } from '../status/dot'
import { statusWords, toneOf } from '../status/words'
import type { Ui } from '../ui'
import { type PcChoice, pcChoices } from './choices'
import type { ThreadPlace } from './thread-pc'

const glyph = (view: PcView | undefined) => (view?.status.phase === 'connected' && view.status.route.kind === 'local' ? 'laptop' : 'monitor')

const byHome = (a: PcView, b: PcView) => Number(b.home) - Number(a.home) || a.name.localeCompare(b.name)

export const pcTab = (ui: Ui, { pc, draft }: ThreadPlace) => {
  const { choiceItem, icon, metaLine, popover, trayChip } = ui.kit
  const open = sig(false)
  const close = () => open.set(false)
  const view = derive(() => ui.data.pcs.get().find(found => found.id === pc.get()))
  const choices = derive(() => pcChoices(ui, [...ui.data.pcs.get()].sort(byHome), draft.get(), ui.ctx.get(projects)))
  const visible = derive(() => ui.data.pcs.get().length > 1 || !view.get()?.home)
  const words = () => {
    const current = view.get()
    return current ? statusWords(current, ui.data.nameOf, ui.device(), ui.data.now.get()) : ''
  }

  const pick = (choice: PcChoice) => {
    close()
    if (choice.blocked === 'bad') return ui.open.why(choice.view.id)
    const target = draft.get()
    if (!target || choice.blocked || choice.cwd === undefined || choice.view.id === target.device) return
    const found = ui.ctx.get(threads)
    if (!found) return
    void ui.toasts.attempt(`Couldn’t move the draft to ${choice.view.name}`, found.draft(choice.cwd, choice.view.id, target.id).then(() => ui.ctx.get(composer)?.focus()))
  }

  const row = (choice: PcChoice) =>
    choiceItem(
      { selected: choice.view.id === pc.get(), disabled: choice.blocked === 'offline' || choice.blocked === 'missing', onClick: () => pick(choice) },
      toneDot(ui.kit, () => toneOf(choice.view.status), () => choice.meta),
      span({ class: 'min-w-0 flex-1 truncate' }, ui.data.nameOf(choice.view.id)),
      metaLine(choice.meta),
    )

  const label = () => [
    toneDot(ui.kit, () => (view.get() ? toneOf(view.get()!.status) : 'off'), words),
    dynamicChild(view, current => icon(glyph(current), 'sm')),
    span({ class: 'min-w-0 truncate' }, () => ui.data.nameOf(pc.get())),
  ]

  const viewOf = () =>
    div(
      { class: 'relative flex min-w-0' },
      dynamicChild(
        derive(() => Boolean(draft.get())),
        choosing =>
          choosing
            ? trayChip({ open, toggle: () => open.update(value => !value), title: 'Choose which PC runs this thread' }, ...label())
            : span({ class: 'flex min-w-0 items-center gap-1.5 px-1 text-xs text-neutral-500', title: words }, ...label()),
      ),
      show(open, () =>
        popover(
          close,
          {
            class: 'bottom-full left-0 mb-2 w-64 overflow-auto',
            style: { ...ui.kit.stableGutter, maxWidth: `calc(100vw - ${SPACE['8']})`, maxHeight: `calc(100vh - ${SPACE['32']})` },
            'aria-label': 'Which PC runs this thread',
          },
          dynamicChild(choices, list => div({ class: 'flex flex-col' }, ...list.map(row))),
        ),
      ),
    )

  return { view: viewOf, visible }
}
