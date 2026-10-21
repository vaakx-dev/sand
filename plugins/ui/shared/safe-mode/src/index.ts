import { place } from '@sand/layout/place'
import { kit } from '@sand/ui-kit/contract'
import { wire } from '@sand/web-client/contract'
import { effect, untrack } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { bannerView } from './banner'
import { safeSource } from './source'

export default definePlugin({
  name: 'safe-mode',
  description: 'Shows when sand runs in safe mode and lets you leave it',
  inject: { wire, kit },
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
