import { joinDisposers } from '@sand/kit'
import { definePlugin } from 'drydock'
import { fontRoutes } from './fonts/serve'

export default definePlugin({
  name: 'math',
  description: 'Serves the KaTeX fonts the web UI typesets formulas with',
  uses: { server: 'formulas are drawn in fallback fonts' },
  apply(ctx) {
    const routes = fontRoutes()
    ctx.watch('server', server => (server ? joinDisposers(...routes.map(({ path, handler }) => server.route(path, handler, { public: true }))) : undefined))
  },
})
