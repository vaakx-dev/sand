import type { PaletteReviewRow } from '@sand/palette/contract'
import type { FlowContext } from '../types'
import { placed } from './names'
import type { CopyPlan } from './plan'
import { countOf, formatSize } from './size'

export const largeCopy = 500 * 1024 * 1024

export const totalBytes = ({ inspect }: CopyPlan) => inspect.bytes + (inspect.git ? inspect.historyBytes : 0)

const whatRow = ({ inspect }: CopyPlan): PaletteReviewRow => ({
  label: 'What',
  value: `${countOf(inspect.files, 'file')}, ${formatSize(inspect.bytes)}${inspect.git ? `; git history, ${formatSize(inspect.historyBytes)}` : ''}`,
})

const skippedRows = ({ inspect }: CopyPlan): PaletteReviewRow[] => {
  if (!inspect.skipped.length) return []
  const size = formatSize(inspect.skipped.reduce((sum, item) => sum + item.bytes, 0))
  return [{ label: 'Skipped', value: `${inspect.skipped.map(item => item.name).join(', ')} (${size})` }]
}

export const copyRows = (ctx: FlowContext, plan: CopyPlan): PaletteReviewRow[] => {
  const { inspect } = plan
  const linking = plan.existing > 0
  return [
    { label: 'From', value: placed(ctx, plan.from) },
    { label: 'To', value: placed(ctx, plan.to) },
    linking ? { label: 'Folder', value: `Already has ${countOf(plan.existing, 'file')}. Only what is different is sent` } : whatRow(plan),
    ...skippedRows(plan),
    ...(inspect.secrets.length ? [{ label: 'Left out', value: `${inspect.secrets.join(', ')} (looks like secrets)` }] : []),
    ...(inspect.setup && !linking ? [{ label: 'Then run', value: inspect.setup, mono: true }] : []),
    ...(totalBytes(plan) > largeCopy ? [{ label: 'Warning', value: 'This is a large copy and may take a while' }] : []),
  ]
}
