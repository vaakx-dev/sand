import { wire } from '@sand/devices-contract'
import { diffView } from '@sand/git-diff-view/contract'
import { inspector } from '@sand/inspector/contract'
import { panel } from '@sand/panel/contract'
import { kit } from '@sand/ui-kit/contract'
import { definePlugin } from 'drydock'
import { liveChanges } from './live'
import { changesView } from './view'

const id = 'changes'
const label = 'Changes'
const icon = 'file-diff'

export default definePlugin({
  name: 'panel-changes',
  description: "The files a thread changed: each file's patch in a side panel tab, and a row in Details with the lines added and removed that opens it",
  inject: { panel, diffView, wire, kit },
  apply(ctx) {
    const changesOf = liveChanges(ctx, ctx.wire)
    ctx.effect(() =>
      ctx.panel.tab({
        id,
        label,
        icon,
        order: 10,
        shows: subject => (changesOf(subject)?.files.length ?? 0) > 0,
        render: subject => changesView(ctx.diffView, changesOf, subject),
      }),
    )
    ctx.watch(inspector, found =>
      found?.row({
        id,
        group: 'git',
        order: 40,
        shows: subject => (changesOf(subject)?.files.length ?? 0) > 0 && !ctx.panel.showing(id, subject),
        render: subject =>
          ctx.kit.cardItem(
            {
              lead: ctx.kit.icon(icon, 'sm'),
              end: ctx.kit.lineStat(
                () => changesOf(subject())?.add ?? 0,
                () => changesOf(subject())?.del ?? 0,
              ),
              onClick: () => ctx.panel.show(id),
            },
            label,
          ),
      }),
    )
  },
})
