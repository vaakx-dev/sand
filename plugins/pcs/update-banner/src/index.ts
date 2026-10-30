import { pcs, wire } from '@sand/devices-contract'
import { place } from '@sand/layout/place'
import { settings } from '@sand/settings/contract'
import { kit } from '@sand/ui-kit/contract'
import { owned } from '@sand/web-client/reactive'
import { definePlugin, type Dispose } from 'drydock'
import { createFleet } from './fleet/model'
import { updatesPage } from './page'
import { updateSheet } from './sheet/view'

export default definePlugin({
  name: 'update-banner',
  description: 'Marks Settings with a dot when a newer sand is ready and updates all your PCs to it when you click Update',
  inject: { wire, pcs, kit },
  apply(ctx) {
    const fleet = owned(ctx, () => createFleet(ctx))
    let unplaceSheet: Dispose | undefined
    const close = () => {
      void unplaceSheet?.()
      unplaceSheet = undefined
    }
    const open = () => {
      close()
      unplaceSheet = place(ctx, 'overlay', () => updateSheet(ctx.kit, fleet, close), 100)
    }
    const dot = () => fleet.pending.get().some(pc => !pc.state?.later)
    ctx.watch(settings, found =>
      found?.page({ id: 'updates', label: 'Updates', icon: 'reload', order: 70, dot, render: () => updatesPage(ctx.kit, fleet, open) }),
    )
  },
})
