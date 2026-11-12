import { pcs, wire } from '@sand/devices-contract'
import { sheetSlot } from '@sand/ui-shell/contract'
import { settings } from '@sand/settings/contract'
import { kit } from '@sand/ui-kit/contract'
import { owned } from '@sand/reactive'
import { definePlugin } from 'drydock'
import { createFleet } from './fleet/model'
import { updatesPage } from './page'
import { updateSheet } from './sheet/view'

export default definePlugin({
  name: 'update-banner',
  description: 'Marks Settings with a dot when a newer sand is ready and updates all your PCs to it when you click Update',
  inject: { wire, pcs, kit },
  apply(ctx) {
    const fleet = owned(ctx, () => createFleet(ctx))
    const sheet = sheetSlot(ctx)
    const open = () => sheet.open(() => updateSheet(ctx.kit, fleet, sheet.close))
    const dot = () => fleet.pending.get().some(pc => !pc.state?.later)
    ctx.watch(settings, found =>
      found?.page({ id: 'updates', label: 'Updates', intro: 'Keep sand current on every PC.', icon: 'reload', group: 'app', order: 70, dot, render: () => updatesPage(ctx.kit, fleet, open) }),
    )
  },
})
