import { delayed, div, dot, dynamicChild, icon, iconButton, segmented, show, span, spinner, type Child } from '@sand/dom'
import type { UsageModel } from '../model'
import { allPcs } from '../prefs'
import { rangeLabel, ranges } from '../range'
import { spacer } from './parts'

const pcFilter = (model: UsageModel) =>
  dynamicChild(model.pcs, pcs =>
    pcs.length > 1
      ? segmented(
          [
            { value: allPcs, label: 'All PCs' },
            ...pcs.map(pc => ({ value: pc.id, label: pc.name, title: pc.online ? 'Online' : 'Offline', mark: dot(pc.online ? 'success' : 'neutral') })),
          ],
          model.pc,
          value => model.pc.set(value),
          { label: 'PC' },
        )
      : span(),
  )

const reloadButton = (model: UsageModel): Child => {
  const waiting = delayed(model.busy)
  return iconButton(
    { size: 'sm', title: 'Reload usage', onClick: model.refresh, disabled: model.busy },
    show(waiting, () => spinner()),
    show(waiting.map(shown => !shown), () => icon('reload', 13)),
  )
}

export const toolbar = (model: UsageModel) =>
  div(
    { class: 'flex flex-wrap items-center gap-2' },
    pcFilter(model),
    spacer(),
    segmented(
      ranges.map(value => ({ value, label: rangeLabel(value) })),
      model.range,
      value => model.range.set(value),
      { label: 'Period' },
    ),
    reloadButton(model),
  )
