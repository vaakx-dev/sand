import type { RouteHandler } from '@sand/server/contract'
import type { Tokens } from '@sand/util/host'
import { stat } from 'node:fs/promises'
import { basename } from 'node:path'
import { fileStreamRoute } from '../contract'

const SAFE_TYPES = /^(?:image\/|audio\/|video\/|font\/|application\/(?:pdf|zip|octet-stream))/

const HEADERS = {
  'cache-control': 'private, max-age=31536000, immutable',
  'content-security-policy': "default-src 'none'; sandbox",
  'x-content-type-options': 'nosniff',
}

const servedType = (type: string) => (SAFE_TYPES.test(type) ? type : 'text/plain;charset=utf-8')

const notFound = () => new Response('not found', { status: 404 })

const isFile = async (path: string) => (await stat(path).catch(() => undefined))?.isFile() === true

const RANGE = /^bytes=(\d*)-(\d*)$/

const rangeOf = (header: string | null, size: number) => {
  const [, from = '', to = ''] = RANGE.exec(header ?? '') ?? []
  if (!from && !to) return undefined
  const start = from ? Number(from) : Math.max(0, size - Number(to))
  const end = from && to ? Math.min(Number(to), size - 1) : size - 1
  return { start, end }
}

const served = async (path: string, range: string | null) => {
  if (!(await isFile(path))) return notFound()
  const file = Bun.file(path)
  const headers = { ...HEADERS, 'content-type': servedType(file.type), 'accept-ranges': 'bytes' }
  const asked = rangeOf(range, file.size)
  if (!asked) return new Response(file, { headers })
  if (asked.start > asked.end) return new Response('range not satisfiable', { status: 416, headers: { 'content-range': `bytes */${file.size}` } })
  const contentRange = `bytes ${asked.start}-${asked.end}/${file.size}`
  return new Response(file.slice(asked.start, asked.end + 1), { status: 206, headers: { ...headers, 'content-range': contentRange } })
}

const fileResponse: RouteHandler = async request => {
  const path = new URL(request.url).searchParams.get('path')
  return path ? served(path, request.headers.get('range')) : notFound()
}

const subjectOf = (path: string) => Buffer.from(path).toString('base64url')

const pathOf = (subject: string) => Buffer.from(subject, 'base64url').toString()

const streamLink = (tokens: Tokens, path: string) => `${fileStreamRoute}${tokens.issue(subjectOf(path)).token}/${encodeURIComponent(basename(path))}`

const streamResponse =
  (tokens: Tokens): RouteHandler =>
  request => {
    const token = new URL(request.url).pathname.slice(fileStreamRoute.length).split('/')[0] ?? ''
    const checked = tokens.check(token)
    return checked ? served(pathOf(checked.hash), request.headers.get('range')) : new Response('this link is not valid or has expired', { status: 403 })
  }

export { fileResponse, isFile, streamLink, streamResponse }
