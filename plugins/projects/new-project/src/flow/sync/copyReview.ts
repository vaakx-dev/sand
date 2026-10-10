import { bytes } from '@sand/kit'
import type { PalettePage } from '@sand/palette/contract'
import type { Sync } from '../../contract'
import type { FlowContext } from '../types'
import { copyRows, totalBytes } from './copyRows'
import { runCopy } from './copyRun'
import type { CopyPlan } from './plan'

export const copyReviewPage = (ctx: FlowContext, sync: Sync, plan: CopyPlan): PalettePage => ({
  id: 'copy-review',
  title: 'Review',
  review: {
    rows: copyRows(ctx, plan),
    action: plan.existing > 0 ? 'Link and send what is different' : `Copy ${bytes(totalBytes(plan))}`,
    run: progress => runCopy(ctx, sync, plan, progress),
  },
})
