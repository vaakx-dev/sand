import { owned } from '@sand/reactive'
import { listen } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'

export const onLeave = (ctx: Context, run: () => void) =>
  owned(ctx, () => {
    listen(window, 'visibilitychange', () => {
      if (document.visibilityState === 'hidden') run()
    })
    listen(window, 'pagehide', run)
  })
