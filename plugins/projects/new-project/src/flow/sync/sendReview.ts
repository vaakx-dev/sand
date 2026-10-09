import type { PalettePage, ProjectRef, Sync } from '@sand/protocol'
import { relationLabel } from '@sand/kit'
import type { FlowContext } from '../types'
import { pcName, placed, projectName } from './names'
import { progressText } from './progress'
import { reportSend } from './result'

export const sendPage = (ctx: FlowContext, sync: Sync, from: ProjectRef, to: ProjectRef): PalettePage => {
  const relation = sync.relation(from, to)
  return {
    id: 'send-review',
    title: `Send ${projectName(ctx, from)} from ${pcName(ctx, from.device)} to ${pcName(ctx, to.device)}`,
    review: {
      rows: [
        { label: 'From', value: placed(ctx, from) },
        { label: 'To', value: placed(ctx, to) },
        { label: 'State', value: relation ? relationLabel(relation, pcName(ctx, to.device)) : 'Not compared yet' },
      ],
      action: 'Send',
      async run(progress) {
        const applied = await sync.send(from, to, update => progress(progressText(update)))
        await reportSend(ctx, sync, from, to, applied)
      },
    },
  }
}
