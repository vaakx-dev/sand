import { settings } from '@sand/settings/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { homeRoute, shell } from '@sand/ui-shell/contract'
import { derive, div, show } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import type { FeatureStore } from './store'

const fillingShell = ['threads', 'bots', 'calendar']

const emptyView = ({ primaryAction, setupFrame, setupHeading, setupNote, setupScreen }: Kit, open: () => void) =>
  setupFrame(
    setupScreen(
      setupHeading('Nothing here yet'),
      setupNote('Turn on a feature like Threads, Bots or Calendar to use sand here.'),
      primaryAction({ onClick: open }, 'Choose features'),
    ),
  )

export const emptyHome = (ctx: Context, kit: Kit, store: FeatureStore) => {
  const open = () => ctx.get(settings)?.open('features')
  ctx.watch(shell, found =>
    found?.route({
      kind: homeRoute,
      order: 1000,
      render: () => ({
        head: () => '',
        main() {
          const bare = derive(() => store.choice.get() !== undefined && fillingShell.every(id => !store.feature(id)?.on))
          return div({ class: 'h-full w-full' }, show(bare, () => emptyView(kit, open)))
        },
      }),
    }),
  )
}
