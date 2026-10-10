import { bytes, plural } from '@sand/kit'
import type { PalettePage, PaletteReviewRow } from '@sand/palette/contract'
import type { Sync } from '../../contract'
import type { ProjectsContext } from '../../context'
import { runCopy } from './copyRun'
import { placed } from './names'
import type { CopyPlan } from './plan'

const largeCopy = 500 * 1024 * 1024

const totalBytes = ({ inspect }: CopyPlan) => inspect.bytes + (inspect.git ? inspect.historyBytes : 0)

const whatRow = ({ inspect }: CopyPlan): PaletteReviewRow => ({
  label: 'What',
  value: `${plural(inspect.files, 'file')}, ${bytes(inspect.bytes)}${inspect.git ? `; git history, ${bytes(inspect.historyBytes)}` : ''}`,
})

const skippedRows = ({ inspect }: CopyPlan): PaletteReviewRow[] => {
  if (!inspect.skipped.length) return []
  const size = bytes(inspect.skipped.reduce((sum, item) => sum + item.bytes, 0))
  return [{ label: 'Skipped', value: `${inspect.skipped.map(item => item.name).join(', ')} (${size})` }]
}

const copyRows = (ctx: ProjectsContext, plan: CopyPlan): PaletteReviewRow[] => {
  const { inspect } = plan
  const linking = plan.existing > 0
  return [
    { label: 'From', value: placed(ctx, plan.from) },
    { label: 'To', value: placed(ctx, plan.to) },
    linking ? { label: 'Folder', value: `Already has ${plural(plan.existing, 'file')}. Only what is different is sent` } : whatRow(plan),
    ...skippedRows(plan),
    ...(inspect.secrets.length ? [{ label: 'Left out', value: `${inspect.secrets.join(', ')} (looks like secrets)` }] : []),
    ...(inspect.setup && !linking ? [{ label: 'Then run', value: inspect.setup, mono: true }] : []),
    ...(totalBytes(plan) > largeCopy ? [{ label: 'Warning', value: 'This is a large copy and may take a while' }] : []),
  ]
}

export const copyReviewPage = (ctx: ProjectsContext, sync: Sync, plan: CopyPlan): PalettePage => ({
  id: 'copy-review',
  title: 'Review',
  review: {
    rows: copyRows(ctx, plan),
    action: plan.existing > 0 ? 'Link and send what is different' : `Copy ${bytes(totalBytes(plan))}`,
    run: progress => runCopy(ctx, sync, plan, progress),
  },
})
