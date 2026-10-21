import { server as serverService } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import { definePlugin } from 'drydock'
import { fontRoutes } from './fonts/serve'

export default definePlugin({
  name: 'math',
  description: 'Serves the KaTeX fonts the web UI typesets formulas with',
  apply(ctx) {
    const routes = fontRoutes()
    ctx.watch(serverService, server => (server ? joinDisposers(...routes.map(({ path, handler }) => server.route(path, handler, { public: true }))) : undefined))
  },
})
