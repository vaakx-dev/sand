import { owned } from '@sand/reactive'
import { definePlugin } from 'drydock'
import { nav } from './contract'
import { navHost } from './host'

export default definePlugin({
  name: 'nav',
  description: 'Actions that the thread sidebar draws, and the action shape menus share',
  apply(ctx) {
    ctx.provide(
      nav,
      owned(ctx, () => navHost(ctx)),
    )
  },
})
