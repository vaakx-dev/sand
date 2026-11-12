import { composer, type PlusEntry } from '@sand/composer/contract'
import type { PcView } from '@sand/devices-contract'
import { projects, threads } from '@sand/web-client/contract'
import { derive, div, dynamicChild, sig, span } from '@vaakx-dev/vrui'
import { iconKinds } from '../icon/kinds'
import { toneDot } from '../status/dot'
import { toneOf } from '../status/words'
import type { Ui } from '../ui'
import { type PcChoice, pcChoices } from './choices'
import type { ThreadPlace } from './thread-pc'

const glyph = (view: PcView | undefined) => iconKinds[view?.icon ?? 'desktop'].glyph

const byHome = (a: PcView, b: PcView) => Number(b.home) - Number(a.home) || a.name.localeCompare(b.name)

export const pcEntry = (ui: Ui, { pc, draft }: ThreadPlace) => {
  const { choiceItem, metaLine } = ui.kit
  const open = sig(false)
  const close = () => open.set(false)
  const view = derive(() => ui.data.pcs.get().find(found => found.id === pc.get()))
  const choices = derive(() => pcChoices(ui, [...ui.data.pcs.get()].sort(byHome), draft.get(), ui.ctx.get(projects)))
  const visible = derive(() => Boolean(draft.get()) && ui.data.pcs.get().length > 1)
  const name = () => ui.data.nameOf(pc.get())

  const pick = (choice: PcChoice) => {
    close()
    if (choice.blocked === 'bad') return ui.open.why(choice.view.id)
    const target = draft.get()
    if (!target || choice.blocked || choice.cwd === undefined || choice.view.id === target.device) return
    const found = ui.ctx.get(threads)
    if (!found) return
    found.plan({ id: target.id, cwd: choice.cwd, device: choice.view.id })
    ui.ctx.get(composer)?.focus()
  }

  const row = (choice: PcChoice) =>
    choiceItem(
      { selected: choice.view.id === pc.get(), disabled: choice.blocked === 'offline' || choice.blocked === 'missing', onClick: () => pick(choice) },
      toneDot(ui.kit, () => toneOf(choice.view.status), () => choice.meta),
      span({ class: 'min-w-0 flex-1 truncate' }, ui.data.nameOf(choice.view.id)),
      metaLine(choice.meta),
    )

  const goHome = () => {
    const home = choices.get().find(choice => choice.view.home)
    if (home) pick(home)
  }

  const entry: PlusEntry = {
    icon: () => glyph(view.get()),
    label: name,
    open,
    panel: () => dynamicChild(choices, list => div({ class: 'flex flex-col' }, ...list.map(row))),
    unusual: () => (view.get()?.home ? undefined : name()),
    reset: goHome,
  }

  return { entry, visible }
}
