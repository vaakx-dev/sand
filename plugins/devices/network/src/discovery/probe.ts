import { deviceParams, devicePaths, type PcIdentity } from '@sand/devices-contract'
import { isIdentityReply, newNonce, provesIdentity } from '@sand/devices-identity'

export const probeIdentity = async (url: string, timeout: number): Promise<PcIdentity | undefined> => {
  const nonce = newNonce()
  const target = new URL(devicePaths.identity, url)
  target.searchParams.set(deviceParams.nonce, nonce)
  try {
    const response = await fetch(target, { signal: AbortSignal.timeout(timeout), redirect: 'error' })
    if (!response.ok) return undefined
    const reply: unknown = await response.json()
    if (!isIdentityReply(reply) || !(await provesIdentity(reply, nonce))) return undefined
    return { id: reply.id, name: reply.name, platform: reply.platform, publicKey: reply.publicKey }
  } catch {
    return undefined
  }
}
