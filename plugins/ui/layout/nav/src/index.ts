import { owned } from '@sand/web-client/reactive'
import { definePlugin } from 'drydock'
import { nav } from './contract'
import { navHost } from './host'

export default definePlugin({
  name: 'nav',
  description: 'Actions that sidebars draw',
  apply(ctx) {
    ctx.provide(
      nav,
      owned(ctx, () => navHost(ctx)),
    )
  },
})
