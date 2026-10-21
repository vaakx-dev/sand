import type { Session } from '@sand/chats/contract'
import type { RouteHandler } from '@sand/server/contract'
import { basename, isAbsolute, resolve } from 'node:path'
import { seenImage } from './seen'

type OpenSession = (session: string) => Session | undefined

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

const image = (body: BodyInit, type: string) =>
  new Response(body, { headers: { 'content-type': type, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } })

export const imageRoute =
  (open: OpenSession): RouteHandler =>
  async request => {
    const params = new URL(request.url).searchParams
    const session = open(params.get('session') ?? '')
    const path = pathOf(params.get('src') ?? '', session?.cwd)
    if (!path || network.test(path) || !shown.test(path)) return notFound()
    const seen = session && seenImage(session, basename(path), Number(params.get('before')) || Infinity)
    if (seen?.data) return image(Buffer.from(seen.data, 'base64'), seen.mediaType)
    const file = Bun.file(path)
    if (!(await file.exists())) return notFound()
    return image(file, file.type)
  }
