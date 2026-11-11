import { cli, pluginSwitches } from '@sand/config/contract'
import { loadPcIdentity } from '@sand/devices-identity/pc'
import { server } from '@sand/server/contract'
import { expandHome, packageExports, pluginContracts } from '@sand/util/fs'
import { definePlugin } from 'drydock'
import { join } from 'node:path'
import { z } from 'zod'
import { ASSETS } from './bundle/build'
import { webBuild, webExtensions, webExtensionsReport, webPluginsOff } from './contract'
import { discover } from './extensions/discover'
import { createSite } from './extensions/site'
import { createStates } from './extensions/states'
import { assetResponse } from './page/asset'
import { headers } from './page/headers'
import { iconRoutes } from './page/icons'
import { page } from './page/page'
import { manifestRoute, schemeHint } from './pwa/manifest'
import { workerResponse } from './pwa/worker'

export default definePlugin({
  name: 'web',
  description: 'Serves the browser UI: bundles the web extensions and hands them to the page',
  inject: { server, cli, pluginSwitches },
  config: z.object({
    paths: z.array(z.string()).default([]),
  }),
  async apply(ctx, config) {
    const { home, safe } = ctx.cli
    const builtins = [{ dir: ctx.cli.builtins, builtin: true }]
    const folders = safe ? builtins : [...builtins, { dir: join(home, 'plugins'), builtin: false }]
    const extra = safe ? [] : config.paths.map(path => ({ dir: expandHome(path, home), builtin: false }))
    const switches = ctx.pluginSwitches
    const site = await createSite({
      find: async () => (await discover(folders, extra)).filter(extension => !switches.turnedOff(extension.dir)),
      modules: { ...(await pluginContracts(ctx.cli.builtins)), ...(await packageExports(join(ctx.cli.builtins, '..', 'packages'))) },
      report: problem => ctx.report(new Error(problem)),
    })
    const states = createStates(site, switches)
    ctx.provide(webExtensions, { list: states.list })
    const { id: pc } = await loadPcIdentity(home)
    const routes = {
      '/': () => new Response(page(site.current(), pc, states.unmounted()), { headers: { ...headers('text/html'), 'accept-ch': schemeHint } }),
      [ASSETS]: (request: Request) => assetResponse(request, site.current()),
      '/build': () => new Response(site.current().entry, { headers: headers('text/plain') }),
      '/manifest.webmanifest': manifestRoute,
      '/sw.js': () => workerResponse(site.current()),
      ...iconRoutes,
    }
    for (const [path, handler] of Object.entries(routes)) ctx.effect(() => ctx.server.route(path, handler, { public: true }))
    ctx.effect(() => ctx.server.handle(webExtensionsReport, request => states.report(request.states)))
    ctx.effect(() => ctx.server.handle(webPluginsOff, () => states.off()))
    ctx.server.broadcast(webBuild, site.current().entry)
  },
})
