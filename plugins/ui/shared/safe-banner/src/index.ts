import { place } from '@sand/kit/web'
import { effect, untrack } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { bannerView } from './banner'
import { safeSource } from './source'

export default definePlugin({
  name: 'safe-banner',
  description: 'Shows when sand runs in safe mode and lets you leave it',
  inject: ['wire', 'kit'],
  uses: {
    layout: 'the safe mode notice sits loose above the app',
    notify: 'no message when leaving safe mode fails',
  },
  apply(ctx) {
    const source = safeSource(ctx)
    ctx.effect(() =>
      effect(() => {
        if (!source.safe.get()) return
        const remove = untrack(() => place(ctx, 'top', () => bannerView(ctx.kit, source), -2))
        return () => void remove()
      }),
    )
  },
})
