import { derive, effect, owned, place, untrack } from '@sand/dom'
import { definePlugin } from 'drydock'
import { bannerView, bannerVisible } from './banner'
import { updateSource } from './source'

export default definePlugin({
  name: 'update-banner',
  description: 'Offers newer sand builds from your other PCs',
  inject: ['wire'],
  uses: {
    layout: 'the banner sits loose above the app',
    notify: 'no message when an update request fails',
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
  },
})
