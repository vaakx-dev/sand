import type { HostIdentity } from '@sand/host-gateway/contract'
import { fetchHostIdentity } from '@sand/kit'

export interface Probe {
  url: string
  latency: number
  identity: HostIdentity
}

export const probe = async (url: string, timeout: number): Promise<Probe> => {
  const start = performance.now()
  const identity = await fetchHostIdentity(url, timeout)
  return { url, latency: performance.now() - start, identity }
}
