import { effect, owned, place, untrack } from '@sand/dom'
import { definePlugin, type Dispose } from 'drydock'
import { bannerKind, bannerView } from './banner'
import { createFleet } from './fleet/model'
import { updatesPage } from './page'
import { updateSheet } from './sheet/view'

export default definePlugin({
  name: 'update-banner',
  description: 'Tells you what a newer sand changes and updates all your PCs to it when you click Update',
  inject: ['wire', 'machines'],
  uses: {
    layout: 'the update notice sits loose above the app',
    notify: 'no message when an update request fails',
    settings: 'no Updates settings page',
  },
  apply(ctx) {
    const fleet = owned(ctx, () => createFleet(ctx))
    const kind = owned(ctx, () => bannerKind(fleet))
    let unplaceSheet: Dispose | undefined
    const close = () => {
      void unplaceSheet?.()
      unplaceSheet = undefined
    }
    const open = () => {
      close()
      unplaceSheet = place(ctx, 'overlay', () => updateSheet(fleet, close), 100)
    }
    ctx.effect(() => close)
    ctx.effect(() =>
      effect(() => {
        if (!kind.get()) return
        const remove = untrack(() => place(ctx, 'top', () => bannerView(fleet, () => kind.get(), open), -1))
        return () => void remove()
      }),
    )
    ctx.watch('settings', settings =>
      settings?.page({ id: 'updates', label: 'Updates', icon: 'reload', order: 70, render: () => updatesPage(fleet, open) }),
    )
  },
})
