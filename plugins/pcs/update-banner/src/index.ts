import { place } from '@sand/layout/place'
import { settings } from '@sand/settings/contract'
import { kit } from '@sand/ui-kit/contract'
import { machines, wire } from '@sand/web-client/contract'
import { owned } from '@sand/web-client/reactive'
import { effect, untrack } from '@vaakx-dev/vrui'
import { definePlugin, type Dispose } from 'drydock'
import { bannerKind, bannerView } from './banner'
import { createFleet } from './fleet/model'
import { updatesPage } from './page'
import { updateSheet } from './sheet/view'

export default definePlugin({
  name: 'update-banner',
  description: 'Tells you what a newer sand changes and updates all your PCs to it when you click Update',
  inject: { wire, machines, kit },
  apply(ctx) {
    const fleet = owned(ctx, () => createFleet(ctx))
    const kind = owned(ctx, () => bannerKind(fleet))
    const shown = owned(ctx, () => kind.map(Boolean))
    let unplaceSheet: Dispose | undefined
    const close = () => {
      void unplaceSheet?.()
      unplaceSheet = undefined
    }
    const open = () => {
      close()
      unplaceSheet = place(ctx, 'overlay', () => updateSheet(ctx.kit, fleet, close), 100)
    }
    ctx.effect(() =>
      effect(() => {
        if (!shown.get()) return
        const remove = untrack(() => place(ctx, 'top', () => bannerView(ctx.kit, fleet, () => kind.get(), open), -1))
        return () => void remove()
      }),
    )
    ctx.watch(settings, found =>
      found?.page({ id: 'updates', label: 'Updates', icon: 'reload', order: 70, render: () => updatesPage(ctx.kit, fleet, open) }),
    )
  },
})
