import { settings } from '@sand/settings/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { shell } from '@sand/ui-shell/contract'
import { derive, div, show } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import type { FeatureStore } from './store'

const fillingShell = ['threads', 'bots', 'calendar']

const emptyRoute = 'empty'

export const CORE = 'features-core'

const emptyView = ({ emptyState, pageBody }: Kit, open: () => void) =>
  pageBody({}, emptyState({ text: 'No features are on.', action: { label: 'Choose features', run: open } }))

export const emptyHome = (ctx: Context, kit: Kit, store: FeatureStore) => {
  const open = () => ctx.get(settings)?.open(CORE)
  const whileBare = () => {
    const bare = derive(() => store.choice.get() !== undefined && fillingShell.every(id => !store.feature(id)?.on))
    return show(bare, () => emptyView(kit, open))
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
