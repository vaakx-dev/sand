import { inspector } from '@sand/inspector/contract'
import { panel, type Panel } from '@sand/panel/contract'
import { kit } from '@sand/ui-kit/contract'
import { derive, dynamicChild, sig } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { liveChanges } from './live'

const changesTab = 'changes'

export default definePlugin({
  name: 'inspector-changes',
  description: "The inspector's changes row: how many lines a thread added and removed",
  inject: { inspector, kit },
  apply(ctx) {
    const countsOf = liveChanges(ctx)
    const sidePanel = sig<Panel | undefined>(undefined)
    ctx.watch(panel, found => sidePanel.set(found))
    ctx.effect(() =>
      ctx.inspector.row({
        id: 'changes',
        group: 'git',
        order: 40,
        shows: subject => (countsOf(subject)?.files ?? 0) > 0,
        render: subject =>
          dynamicChild(
            derive(() => sidePanel.get()?.applies(changesTab, subject()) === true),
            opens =>
              ctx.kit.cardItem(
                {
                  lead: ctx.kit.icon('file-diff', 'sm'),
                  end: ctx.kit.lineStat(
                    () => countsOf(subject())?.add ?? 0,
                    () => countsOf(subject())?.del ?? 0,
                  ),
                  ...(opens && { onClick: () => sidePanel.get()?.show(changesTab) }),
                },
                'Changes',
              ),
          ),
      }),
    )
  },
})
