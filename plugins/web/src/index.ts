import { expandHome } from '@sand/host'
import { definePlugin } from 'drydock'
import { join, resolve } from 'node:path'
import { z } from 'zod'
import { discover } from './extensions/discover'
import { createSite } from './extensions/site'
import { headers } from './page/headers'
import { iconRoutes } from './page/icons'
import { page } from './page/page'

export default definePlugin({
  name: 'web',
  description: 'Serves the browser UI: bundles the web extensions and hands them to the page',
  inject: ['server', 'cli'],
  config: z.object({
    extensions: z.record(z.string(), z.boolean()).default({}),
    paths: z.array(z.string()).default([]),
  }),
  async apply(ctx, config) {
    const { cwd, home } = ctx.cli
    const folders = [
      { dir: resolve(import.meta.dir, '..', '..'), builtin: true },
      { dir: join(home, 'plugins'), builtin: false },
      { dir: join(cwd, '.sand', 'plugins'), builtin: false },
    ]
    const extra = config.paths.map(path => ({ dir: expandHome(path, cwd), builtin: false }))
    const site = await createSite({
      home,
      configured: config.extensions,
      find: enabled => discover(folders, extra, enabled),
      report: problem => ctx.report(new Error(problem)),
      broadcast: (name, args) => ctx.server.broadcast(name, args),
    })
    const token = (request: Request) => new URL(request.url).searchParams.get('token') ?? ''
    const routes = {
      '/': (request: Request) => new Response(page(token(request), site.current().id, site.enabled()), { headers: headers('text/html') }),
      '/app.js': () => new Response(site.current().script, { headers: headers('text/javascript') }),
      '/build': () => new Response(site.current().id, { headers: headers('text/plain') }),
      ...iconRoutes,
    }
    for (const [path, handler] of Object.entries(routes)) ctx.effect(() => ctx.server.route(path, handler))
    ctx.effect(() => ctx.server.handle('web.extensions', () => site.enabled()))
    ctx.effect(() => ctx.server.handle('web.extensions.set', ({ extension, enabled }) => site.set(extension, enabled)))
    ctx.effect(() => ctx.server.handle('web.extensions.reset', () => site.reset()))
    ctx.server.broadcast('web.build', [site.current().id])
  },
})
