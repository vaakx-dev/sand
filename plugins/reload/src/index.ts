import { definePlugin } from 'drydock'
import { reloadUI } from './ui'

export default definePlugin({
  name: 'reload',
  description: 'Reloads plugins from disk when you ask, with /reload or the sidebar button',
  apply(ctx) {
    if (ctx.cli?.mode === 'print') return
    ctx.plugin(reloadUI)
  },
})
