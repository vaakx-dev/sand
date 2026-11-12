import { settings } from '@sand/settings/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { shell } from '@sand/ui-shell/contract'
import { derive, div, show } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import type { FeatureStore } from './store'

const fillingShell = ['threads', 'bots', 'calendar']

const emptyRoute = 'empty'

const emptyView = ({ primaryAction, setupHeading, setupNote, setupScreen }: Kit, open: () => void) =>
  setupScreen(
    setupHeading('Nothing here yet'),
    setupNote('Turn on a feature like Threads, Bots or Calendar to use sand here.'),
    primaryAction({ onClick: open }, 'Choose features'),
  )

export const emptyHome = (ctx: Context, kit: Kit, store: FeatureStore) => {
  const open = () => ctx.get(settings)?.open('features')
  const whileBare = () => {
    const bare = derive(() => store.choice.get() !== undefined && fillingShell.every(id => !store.feature(id)?.on))
    return show(bare, () => div({ class: 'flex min-h-0 flex-1 flex-col items-center justify-center overflow-auto px-5 py-10 text-center' }, emptyView(kit, open)))
  }
  ctx.watch(shell, found =>
    found?.route({
      kind: emptyRoute,
      order: 1000,
      lands: true,
      render: () => ({
        head: () => '',
        main: () => div({ class: 'flex min-h-0 flex-1 flex-col' }, whileBare()),
      }),
    }),
  )
}
