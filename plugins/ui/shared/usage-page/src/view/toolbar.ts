import { delayed, div, dot, dynamicChild, icon, iconButton, segmented, spinner } from '@sand/dom'
import { usageRanges } from '@sand/kit'
import type { Pc } from '../data/types'
import type { UsageModel } from '../model'
import { allPcs } from '../prefs'
import { rangeLabel } from '../range'
import { spacer } from './parts'

const pcChoice = (pc: Pc) => ({ value: pc.id, label: pc.name, title: pc.online ? 'Online' : 'Offline', mark: dot(pc.online ? 'success' : 'neutral') })

const pcFilter = (model: UsageModel) =>
  dynamicChild(model.pcs, pcs =>
    pcs.length > 1 ? segmented([{ value: allPcs, label: 'All PCs' }, ...pcs.map(pcChoice)], model.pc, value => model.pc.set(value), { label: 'PC' }) : null,
  )

const reloadButton = (model: UsageModel) =>
  iconButton(
    { size: 'sm', title: 'Reload usage', onClick: model.refresh, disabled: model.busy },
    dynamicChild(delayed(model.busy), waiting => (waiting ? spinner() : icon('reload', 13))),
  )

export const toolbar = (model: UsageModel) =>
  div(
    { class: 'flex flex-wrap items-center gap-2' },
    pcFilter(model),
    spacer(),
    segmented(
      usageRanges.map(value => ({ value, label: rangeLabel(value) })),
      model.range,
      value => model.range.set(value),
      { label: 'Period' },
    ),
    reloadButton(model),
  )
