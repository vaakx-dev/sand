import type { RouteCaller } from '@sand/host-gateway/contract'
import type { RuntimeAccess } from '@sand/host-runtimes/contract'

const runtimeParam = 'sand_runtime'
const clientParam = 'sand_client'
const callerParams = { device: 'sand_device', name: 'sand_device_name', kind: 'sand_device_kind' } as const
const kinds: RouteCaller['kind'][] = ['pc', 'phone', 'browser', 'admin']

export const runtimeEnv = { id: 'SAND_RUNTIME_ID', secret: 'SAND_RUNTIME_SECRET' } as const

export const upstreamUrl = (base: string, incoming: URL, secret: string, client: boolean, caller?: RouteCaller): URL => {
  const url = new URL(base)
  url.pathname = incoming.pathname
  url.search = incoming.search
  url.searchParams.delete(clientParam)
  for (const param of Object.values(callerParams)) url.searchParams.delete(param)
  url.searchParams.set(runtimeParam, secret)
  if (!client) return url
  url.searchParams.set(clientParam, '1')
  if (!caller) return url
  url.searchParams.set(callerParams.device, caller.device)
  url.searchParams.set(callerParams.name, caller.name)
  url.searchParams.set(callerParams.kind, caller.kind)
  return url
}

export const upstreamSocketUrl = (base: string, secret: string, device: string): string => {
  const url = upstreamUrl(base, new URL('/ws', base), secret, true)
  url.searchParams.set(callerParams.device, device)
  url.protocol = 'ws:'
  return url.href
}

export const deviceOf = (url: URL) => url.searchParams.get(callerParams.device) ?? undefined

export const accessOf = (url: URL, secret: string): RuntimeAccess => {
  if (url.searchParams.get(runtimeParam) !== secret) return 'denied'
  return url.searchParams.get(clientParam) === '1' ? 'client' : 'public'
}

export const callerOf = (url: URL, secret: string): RouteCaller | undefined => {
  if (accessOf(url, secret) !== 'client') return
  const device = url.searchParams.get(callerParams.device)
  const kind = kinds.find(known => known === url.searchParams.get(callerParams.kind))
  if (!device || !kind) return
  return { device, kind, name: url.searchParams.get(callerParams.name) || device }
}
