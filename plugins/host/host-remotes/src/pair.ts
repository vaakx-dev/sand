import { bearer, fetchHostIdentity, hostPaths, parsePairLink, redeemPairing } from '@sand/kit'
import { remoteUrls } from '@sand/kit/host'
import type { DeviceInfo } from '@sand/protocol'
import type { RemoteRecord } from './contract'

const unpairTimeout = 3000

const unpairAt = async (url: string, key: string) => {
  try {
    await fetch(`${url}${hostPaths.unpair}`, { method: 'POST', headers: bearer(key), signal: AbortSignal.timeout(unpairTimeout) })
    return true
  } catch {
    return false
  }
}

export const unpair = async (record: Pick<RemoteRecord, 'url' | 'urls' | 'key'>) => {
  for (const url of remoteUrls(record)) if (await unpairAt(url, record.key)) return
}

export interface PairBackOptions {
  self: DeviceInfo
  urls: string[]
  mint(host: DeviceInfo): Promise<string>
}

export const pairWith = async (link: string, { self, urls, mint }: PairBackOptions): Promise<{ record: RemoteRecord; mutual: boolean }> => {
  const parsed = parsePairLink(link)
  if (!parsed) throw new Error('Paste the pairing link from Your devices on the other PC (it ends in #pair=...)')
  const { url, secret } = parsed
  const identity = await fetchHostIdentity(url)
  if (identity.deviceId === self.id) throw new Error('That link opens this PC')
  const key = await mint({ id: identity.deviceId, name: identity.name, platform: '' })
  const result = await redeemPairing(url, { secret, name: self.name, kind: 'pc', back: { device: self, urls, key } })
  if (result.host.id !== identity.deviceId) throw new Error(`${url} answered as a different PC`)
  const { id, name, platform } = result.host
  return { record: { id, name, platform, url, urls: result.urls.length ? result.urls : [url], key: result.key }, mutual: result.back === true }
}
