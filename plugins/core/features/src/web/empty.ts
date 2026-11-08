import { settings } from '@sand/settings/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { homeRoute, shell } from '@sand/ui-shell/contract'
import { collectScope, derive, disposeAll, div, show } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import type { FeatureStore } from './store'

const fillingShell = ['threads', 'bots', 'calendar']

const emptyView = ({ primaryAction, setupHeading, setupNote, setupScreen }: Kit, open: () => void) =>
  setupScreen(
    setupHeading('Nothing here yet'),
    setupNote('Turn on a feature like Threads, Bots or Calendar to use sand here.'),
    primaryAction({ onClick: open }, 'Choose features'),
  )

export const emptyHome = (ctx: Context, kit: Kit, store: FeatureStore) => {
  const open = () => ctx.get(settings)?.open('features')
  const whileBare = (frame: string) => {
    const bare = derive(() => store.choice.get() !== undefined && fillingShell.every(id => !store.feature(id)?.on))
    return show(bare, () => div({ class: ['flex flex-col px-5 py-10 text-center', frame] }, emptyView(kit, open)))
  }
  ctx.watch(shell, found => {
    if (!found) return
    const unroute = found.route({
      kind: homeRoute,
      order: 1000,
      render: () => ({
        head: () => '',
        main: () => div({ class: 'flex min-h-0 flex-1 flex-col' }, whileBare('min-h-0 flex-1 items-center justify-center overflow-auto')),
      }),
    })
    const { value, scope } = collectScope(() => div({ class: 'contents' }, whileBare('items-center')))
    const unmount = found.mount('home', value)
    return () => {
      void unroute()
      void unmount()
      disposeAll(scope)
    }
  })
}
