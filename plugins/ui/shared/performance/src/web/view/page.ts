import type { Kit } from '@sand/ui-kit/contract'
import { derive, div, dynamicChild, onInterval, sig } from '@vaakx-dev/vrui'
import { ranges } from '../../contract'
import type { Model } from '../model'
import { offRow, pcCard } from './pc'

const REFRESH_MS = 2_000

const guardSwitch = (kit: Kit, model: Model) =>
  div(
    { class: 'flex min-w-0 flex-1 items-center gap-3' },
    kit.toggleSwitch({
      on: () => model.guard.get() === true,
      disabled: () => model.guard.get() === undefined,
      'aria-label': 'Memory guard',
      onClick: () => void model.setGuard(!model.guard.get()),
    }),
    div({ class: 'flex min-w-0 flex-col text-sm' }, kit.emphasis('Memory guard'), kit.secondaryText('When a PC runs very low on memory, sand stops the chat using the most')),
  )

const rangeChoice = (kit: Kit, model: Model) =>
  kit.segmented(
    ranges.map(range => ({ value: range, label: range })),
    () => model.range.get(),
    range => model.choose(range),
    { label: 'Time shown' },
  )

const pcs = (kit: Kit, model: Model, open: ReturnType<typeof sig<ReadonlySet<string>>>) => {
  const all = model.list()
  const cards = all.flatMap(pc => {
    const heard = model.heard(pc.id)
    return pc.online && heard ? [pcCard(kit, pc, heard, { silent: model.silent(heard), open, where: place => model.where(place, pc.id) })] : []
  })
  const waiting = all.some(pc => pc.online && !model.heard(pc.id))
  const off = all.filter(pc => !pc.online).map(pc => offRow(kit, pc))
  return div(
    { class: 'flex flex-col gap-5' },
    cards.length ? div({ class: ['grid grid-cols-1 items-start gap-5', cards.length > 1 ? 'lg:grid-cols-2' : ''] }, cards) : null,
    waiting && !cards.length ? kit.loadingState() : null,
    off.length ? div({ class: 'flex flex-col gap-2' }, off) : null,
  )
}

export const performancePage = (kit: Kit, model: Model) => {
  const open = sig<ReadonlySet<string>>(new Set())
  model.refresh()
  onInterval(model.refresh, REFRESH_MS)
  return div(
    { class: 'min-h-0 flex-1 overflow-auto overscroll-contain' },
    div(
      { class: 'mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 pt-4 pb-12 sm:px-6' },
      div({ class: 'flex flex-wrap items-center gap-4' }, guardSwitch(kit, model), rangeChoice(kit, model)),
      dynamicChild(
        derive(() => model.seen()),
        () => pcs(kit, model, open),
      ),
    ),
  )
}
