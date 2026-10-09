import { derive, effect, owned, place, untrack } from '@sand/dom'
import { definePlugin } from 'drydock'
import { bannerView, bannerVisible } from './banner'
import { updatesPage } from './page'
import { updateSource } from './source'

export default definePlugin({
  name: 'update-banner',
  description: 'Tells you when a newer sand is on GitHub and installs it when you click Update',
  inject: ['wire'],
  uses: {
    layout: 'the update notice sits loose above the app',
    notify: 'no message when an update request fails',
    settings: 'no Updates settings page',
  },
  apply(ctx) {
    const source = updateSource(ctx)
    const visible = owned(ctx, () => derive(() => bannerVisible(source.state.get())))
    ctx.effect(() =>
      effect(() => {
        if (!visible.get()) return
        const remove = untrack(() => place(ctx, 'top', () => bannerView(source), -1))
        return () => void remove()
      }),
    )
    ctx.watch('settings', settings =>
      settings?.page({ id: 'updates', label: 'Updates', icon: 'reload', order: 70, render: () => updatesPage(source) }),
    )
  },
})
