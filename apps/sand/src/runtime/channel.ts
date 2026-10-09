import type { RouteCaller, RuntimeAccess } from '@sand/protocol'

const runtimeParam = 'sand_runtime'
const clientParam = 'sand_client'
const callerParams = { device: 'sand_device', name: 'sand_device_name', kind: 'sand_device_kind' } as const
const kinds = new Set<RouteCaller['kind']>(['pc', 'phone', 'browser', 'admin'])

export const runtimeEnv = { id: 'SAND_RUNTIME_ID', secret: 'SAND_RUNTIME_SECRET' } as const

export const newSecret = () => Buffer.from(crypto.getRandomValues(new Uint8Array(24))).toString('base64url')

export const upstreamUrl = (base: string, incoming: URL, secret: string, client: boolean, caller?: RouteCaller): URL => {
  const url = new URL(base)
  url.pathname = incoming.pathname
  url.search = incoming.search
  url.searchParams.delete(clientParam)
  for (const param of Object.values(callerParams)) url.searchParams.delete(param)
  url.searchParams.set(runtimeParam, secret)
  if (client) url.searchParams.set(clientParam, '1')
  if (client && caller) for (const [field, param] of Object.entries(callerParams)) url.searchParams.set(param, caller[field as keyof RouteCaller])
  return url
}

export const upstreamSocketUrl = (base: string, secret: string): string => {
  const url = upstreamUrl(base, new URL('/ws', base), secret, true)
  url.protocol = 'ws:'
  return url.href
}

export const accessOf = (url: URL, secret: string): RuntimeAccess => {
  if (url.searchParams.get(runtimeParam) !== secret) return 'denied'
  return url.searchParams.get(clientParam) === '1' ? 'client' : 'public'
}

export const callerOf = (url: URL, secret: string): RouteCaller | undefined => {
  if (accessOf(url, secret) !== 'client') return
  const device = url.searchParams.get(callerParams.device)
  const kind = url.searchParams.get(callerParams.kind) as RouteCaller['kind'] | null
  if (!device || !kind || !kinds.has(kind)) return
  return { device, kind, name: url.searchParams.get(callerParams.name) || device }
}
