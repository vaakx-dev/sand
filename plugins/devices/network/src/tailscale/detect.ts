import { tailscaleErrors } from './errors'
import { servedOn443 } from './served'
import { dnsName, ipv4Of, readStatus, statusTimeout } from './status'

export interface Detected {
  installed: boolean
  running: boolean
  name?: string
  ip?: string
  target?: string
  error?: string
}

export const detect = async (binary: string | undefined): Promise<Detected> => {
  if (!binary) return { installed: false, running: false }
  const read = await readStatus(binary)
  if (!read.ok) return { installed: true, running: false, ...(read.timedOut ? { error: tailscaleErrors.noAnswer(statusTimeout / 1000) } : {}) }
  const name = dnsName(read.status.Self)
  const ip = ipv4Of(read.status.Self)
  const running = read.status.BackendState === 'Running'
  const base = { installed: true, running, ...(name ? { name } : {}), ...(ip ? { ip } : {}) }
  if (!running || !name) return base
  const target = await servedOn443(binary, name)
  return target ? { ...base, target } : base
}
