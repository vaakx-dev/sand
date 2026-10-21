import type { RouteHandler } from '@sand/server/contract'
import { dirname, join } from 'node:path'
import { fontRoute } from './route'

const folder = join(dirname(Bun.resolveSync('katex/package.json', import.meta.dir)), 'dist', 'fonts')

const headers = { 'cache-control': 'max-age=604800', 'x-content-type-options': 'nosniff' }

const serve =
  (name: string): RouteHandler =>
  () =>
    new Response(Bun.file(join(folder, name)), { headers })

export const fontRoutes = () => [...new Bun.Glob('*.woff2').scanSync(folder)].map(name => ({ path: fontRoute + name, handler: serve(name) }))
