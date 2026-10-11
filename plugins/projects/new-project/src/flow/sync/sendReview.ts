import type { ProjectRef } from '@sand/host-projects/contract'
import type { PalettePage } from '@sand/palette/contract'
import { relationLabel } from '@sand/sync/flows'
import type { Sync } from '../../contract'
import type { ProjectsContext } from '../../context'
import { placed, projectName } from './names'
import { progressText, reportSend } from './report'

export const sendPage = (ctx: ProjectsContext, sync: Sync, from: ProjectRef, to: ProjectRef): PalettePage => {
  const relation = sync.relation(from, to)
  return {
    id: 'send-review',
    title: `Send ${projectName(ctx, from)} from ${ctx.machines.name(from.device)} to ${ctx.machines.name(to.device)}`,
    review: {
      rows: [
        { label: 'From', value: placed(ctx, from) },
        { label: 'To', value: placed(ctx, to) },
        { label: 'State', value: relation ? relationLabel(relation, ctx.machines.name(to.device)) : 'Not compared yet' },
      ],
      action: 'Send',
      async run(progress) {
        const applied = await sync.send(from, to, update => progress(progressText(update)))
        await reportSend(ctx, sync, from, to, applied)
      },
    },
  }
}
