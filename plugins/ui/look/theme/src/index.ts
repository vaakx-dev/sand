import { definePlugin } from 'drydock'
import { theme } from './contract'
import { sand } from './sand'

export default definePlugin({
  name: 'theme',
  description: "Sand's colors on a dark page; another theme plugin can provide its own",
  apply(ctx) {
    ctx.provide(theme, sand)
  },
})
