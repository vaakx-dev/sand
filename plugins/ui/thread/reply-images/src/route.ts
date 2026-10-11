import type { RouteHandler } from '@sand/server/contract'
import { isAbsolute, resolve } from 'node:path'

type CwdOf = (session: string) => string | undefined

const shown = /\.(png|jpe?g|gif|webp|avif)$/i
const network = /^[\\/]{2}/

const fromFileUrl = (src: string) => {
  try {
    return Bun.fileURLToPath(src)
  } catch {
    return undefined
  }
}

const pathOf = (src: string, cwd: string | undefined) => {
  if (src.startsWith('file:')) return fromFileUrl(src)
  if (isAbsolute(src)) return src
  return cwd && resolve(cwd, src)
}

const notFound = () => new Response('not found', { status: 404 })

export const imageRoute =
  (cwdOf: CwdOf): RouteHandler =>
  async request => {
    const params = new URL(request.url).searchParams
    const path = pathOf(params.get('src') ?? '', cwdOf(params.get('session') ?? ''))
    if (!path || network.test(path) || !shown.test(path)) return notFound()
    const file = Bun.file(path)
    if (!(await file.exists())) return notFound()
    return new Response(file, { headers: { 'content-type': file.type, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } })
  }
