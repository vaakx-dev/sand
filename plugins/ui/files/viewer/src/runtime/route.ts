import type { RouteHandler } from '@sand/server/contract'
import { stat } from 'node:fs/promises'

const SAFE_TYPES = /^(?:image\/|audio\/|video\/|font\/|application\/(?:pdf|zip|octet-stream))/

const servedType = (type: string) => (SAFE_TYPES.test(type) ? type : 'text/plain;charset=utf-8')

const HEADERS = {
  'cache-control': 'private, max-age=31536000, immutable',
  'content-security-policy': "default-src 'none'; sandbox",
  'x-content-type-options': 'nosniff',
}

const fileResponse: RouteHandler = async request => {
  const path = new URL(request.url).searchParams.get('path')
  const info = path ? await stat(path).catch(() => undefined) : undefined
  if (!path || !info?.isFile()) return new Response('not found', { status: 404 })
  const file = Bun.file(path)
  return new Response(file, { headers: { ...HEADERS, 'content-type': servedType(file.type) } })
}

export { fileResponse }
