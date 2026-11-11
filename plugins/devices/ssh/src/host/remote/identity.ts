import { deviceParams, devicePaths, type PcIdentity } from '@sand/devices-contract'
import { isIdentityReply, newNonce, provesIdentity } from '@sand/devices-identity'

const pause = 300
const fetchTimeout = 3000

const identityAt = async (base: string): Promise<PcIdentity | undefined> => {
  const nonce = newNonce()
  const url = `${base}${devicePaths.identity}?${deviceParams.nonce}=${encodeURIComponent(nonce)}`
  const response = await fetch(url, { signal: AbortSignal.timeout(fetchTimeout) }).catch(() => undefined)
  const reply: unknown = response?.ok ? await response.json().catch(() => undefined) : undefined
  if (!isIdentityReply(reply) || !(await provesIdentity(reply, nonce))) return undefined
  const { id, name, platform, publicKey } = reply
  return { id, name, platform, publicKey }
}

export const reachIdentity = async (base: string, signal: AbortSignal): Promise<PcIdentity | undefined> => {
  while (!signal.aborted) {
    const found = await identityAt(base)
    if (found) return found
    await Bun.sleep(pause)
  }
}
