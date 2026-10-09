import type { PalettePage, Sync } from '@sand/protocol'
import type { FlowContext } from '../types'
import { copyRows, totalBytes } from './copyRows'
import { runCopy } from './copyRun'
import type { CopyPlan } from './plan'
import { formatSize } from './size'

export const copyReviewPage = (ctx: FlowContext, sync: Sync, plan: CopyPlan): PalettePage => ({
  id: 'copy-review',
  title: 'Review',
  review: {
    rows: copyRows(ctx, plan),
    action: plan.existing > 0 ? 'Link and send what is different' : `Copy ${formatSize(totalBytes(plan))}`,
    run: progress => runCopy(ctx, sync, plan, progress),
  },
})
