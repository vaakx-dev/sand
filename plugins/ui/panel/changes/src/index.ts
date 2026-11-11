import { wire } from '@sand/devices-contract'
import { diffView } from '@sand/git-diff-view/contract'
import { panel } from '@sand/panel/contract'
import { definePlugin } from 'drydock'
import { liveChanges } from './live'
import { changesView } from './view'

export default definePlugin({
  name: 'panel-changes',
  description: "The side panel's changes tab: the files a thread changed and each file's patch",
  inject: { panel, diffView, wire },
  apply(ctx) {
    const changesOf = liveChanges(ctx, ctx.wire)
    ctx.effect(() =>
      ctx.panel.tab({
        id: 'changes',
        label: 'Changes',
        icon: 'file-diff',
        order: 10,
        shows: subject => (changesOf(subject)?.files.length ?? 0) > 0,
        render: subject => changesView(ctx.diffView, changesOf, subject),
      }),
    )
  },
})
