import { cli } from '@sand/config/contract'
import { loadPcIdentity } from '@sand/devices-identity/pc'
import { server } from '@sand/server/contract'
import { expandHome, pluginContracts } from '@sand/util/fs'
import { definePlugin } from 'drydock'
import { join } from 'node:path'
import { z } from 'zod'
import { webBuild, webExtensions, webExtensionsReport } from './contract'
import { discover } from './extensions/discover'
import { createSite } from './extensions/site'
import { createStates } from './extensions/states'
import { headers } from './page/headers'
import { iconRoutes } from './page/icons'
import { page } from './page/page'
import { scriptResponse } from './page/script'
import { manifestRoute } from './pwa/manifest'
import { workerRoute } from './pwa/worker'

export default definePlugin({
  name: 'web',
  description: 'Serves the browser UI: bundles the web extensions and hands them to the page',
  inject: { server, cli },
  config: z.object({
    paths: z.array(z.string()).default([]),
  }),
  async apply(ctx, config) {
    const { home, safe } = ctx.cli
    const builtins = [{ dir: ctx.cli.builtins, builtin: true }]
    const folders = safe ? builtins : [...builtins, { dir: join(home, 'plugins'), builtin: false }]
    const extra = safe ? [] : config.paths.map(path => ({ dir: expandHome(path, home), builtin: false }))
    const site = await createSite({
      find: () => discover(folders, extra),
      contracts: await pluginContracts(ctx.cli.builtins),
      report: problem => ctx.report(new Error(problem)),
    })
    const states = createStates(site)
    ctx.provide(webExtensions, { list: states.list })
    const { id: pc } = await loadPcIdentity(home)
    const routes = {
      '/': () => new Response(page(site.current().id, pc), { headers: headers('text/html') }),
      '/app.js': (request: Request) => scriptResponse(request, site.current()),
      '/build': () => new Response(site.current().id, { headers: headers('text/plain') }),
      '/manifest.webmanifest': manifestRoute,
      '/sw.js': workerRoute,
      ...iconRoutes,
    }
    for (const [path, handler] of Object.entries(routes)) ctx.effect(() => ctx.server.route(path, handler, { public: true }))
    ctx.effect(() => ctx.server.handle(webExtensionsReport, request => states.report(request.states)))
    ctx.server.broadcast(webBuild, site.current().id)
  },
})
