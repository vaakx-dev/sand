import { layout, layoutChange } from '@sand/layout/contract'
import { sig } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'

export const watchNarrow = (ctx: Context) => {
  const narrow = sig(false)
  ctx.watch(layout, found => {
    narrow.set(Boolean(found?.state().narrow))
  })
  ctx.on(layoutChange, state => narrow.set(state.narrow))
  return () => narrow.get()
}
