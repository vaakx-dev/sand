import { join } from 'node:path'

const folder = join(import.meta.dir, '..', '..', 'assets')
const names = ['32x32.png', '64x64.png', '128x128@2x.png', '192x192.png', '512x512.png']

export const iconRoutes = Object.fromEntries(
  names.map(name => [
    `/icons/${name}`,
    () => new Response(Bun.file(join(folder, name)), { headers: { 'content-type': 'image/png', 'cache-control': 'max-age=86400', 'x-content-type-options': 'nosniff' } }),
  ]),
)
