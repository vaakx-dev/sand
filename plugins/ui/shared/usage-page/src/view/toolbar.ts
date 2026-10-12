import { usageRanges } from '@sand/kit'
import { delayed } from '@sand/kit/web'
import type { Kit } from '@sand/ui-kit/contract'
import { div, dynamicChild, span } from '@vaakx-dev/vrui'
import type { Pc } from '../data/types'
import type { UsageModel } from '../model'
import { allPcs } from '../prefs'
import { rangeLabel } from '../range'

const pcChoice = ({ dot }: Kit, pc: Pc) => ({ value: pc.id, label: pc.name, title: pc.online ? 'Online' : 'Offline', mark: dot(pc.online ? 'success' : 'neutral') })

const pcFilter = (kit: Kit, model: UsageModel) => {
  const { segmented } = kit
  return dynamicChild(model.pcs, pcs =>
    pcs.length > 1
      ? segmented([{ value: allPcs, label: 'All PCs' }, ...pcs.map(pc => pcChoice(kit, pc))], model.pc, value => model.pc.set(value), { label: 'PC' })
      : null,
  )
}

const reloadButton = ({ icon, iconButton, spinner }: Kit, model: UsageModel) =>
  iconButton(
    { size: 'sm', title: 'Reload usage', onClick: model.refresh, disabled: model.busy },
    dynamicChild(delayed(model.busy), waiting => (waiting ? spinner() : icon('reload', 14))),
  )

export const toolbar = (kit: Kit, model: UsageModel) => {
  const { segmented } = kit
  return div(
    { class: 'flex flex-wrap items-center gap-2' },
    pcFilter(kit, model),
    span({ class: 'flex-1' }),
    segmented(
      usageRanges.map(value => ({ value, label: rangeLabel(value) })),
      model.range,
      value => model.range.set(value),
      { label: 'Period' },
    ),
    reloadButton(kit, model),
  )
}
