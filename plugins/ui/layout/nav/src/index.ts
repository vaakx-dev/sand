import { owned } from '@sand/kit/web'
import { definePlugin } from 'drydock'
import { navHost } from './host'

export default definePlugin({
  name: 'nav',
  description: 'Thread lists and actions that sidebars draw',
  apply(ctx) {
    ctx.provide(
      'nav',
      owned(ctx, () => navHost(ctx)),
    )
  },
})
