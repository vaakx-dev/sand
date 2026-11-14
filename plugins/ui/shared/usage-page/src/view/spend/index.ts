import type { Kit } from '@sand/ui-kit/contract'
import { div, span } from '@vaakx-dev/vrui'
import type { Merged } from '../../data/types'
import type { UsageModel } from '../../model'
import { listText } from '../../names'
import { pageRanges } from '../../prefs'
import { rangeLabel } from '../../range'
import { plot } from '../chart/plot'
import { seriesOf } from '../chart/series'
import { headline, modelList } from './figures'

const periodPicker = ({ segmented }: Kit, model: UsageModel) =>
  segmented(
    pageRanges.map(value => ({ value, label: rangeLabel(value) })),
    model.range,
    value => model.range.set(value),
    { label: 'Period' },
  )

const unpricedText = (models: string[]) =>
  models.length > 1
    ? `Leaves out ${listText(models)}, which have no price. Ask sand to add their prices.`
    : `Leaves out ${models[0]}, which has no price. Ask sand to add its price.`

const unpricedNote = ({ unpriced }: Merged) =>
  unpriced.length ? span({ class: 'text-xs text-neutral-500' }, unpricedText(unpriced.map(item => item.model))) : null

const overview = (kit: Kit, usage: Merged) => {
  const { keys, series } = seriesOf(kit, usage)
  return div(
    { class: 'flex flex-col gap-5 md:flex-row md:gap-8' },
    div({ class: 'flex min-w-0 shrink-0 flex-col gap-4 md:w-48' }, headline(usage), unpricedNote(usage), modelList(series)),
    div({ class: 'min-w-0 flex-1' }, plot(kit, { bucket: usage.bucket, keys, series })),
  )
}

export const spendSection = (kit: Kit, usage: Merged, model: UsageModel) =>
  kit.pageSection(
    { title: 'Spend', action: periodPicker(kit, model) },
    usage.total.turns ? overview(kit, usage) : kit.emptyState({ text: 'No usage in this range.' }),
  )
