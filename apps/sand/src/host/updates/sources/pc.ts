import type { HostIdentity, RemoteRecord } from '@sand/protocol'
import { bearer, errorMessage, fetchHostIdentity, hostPaths } from '@sand/kit'
import { downloadBundle } from '../../dist/download'
import { remoteStore } from '../../remotes/store'
import { remoteUrls } from '../../remotes/urls'
import type { BunDownload, UpdateSource } from '../types'

const bunWait = 10 * 60 * 1000

const reach = async (record: RemoteRecord, wait: number): Promise<{ url: string; identity: HostIdentity }> => {
  let last: unknown
  for (const url of remoteUrls(record)) {
    try {
      const identity = await fetchHostIdentity(url, wait)
      if (identity.deviceId === record.id) return { url, identity }
      last = new Error(`${url} is a different PC`)
    } catch (error) {
      last = error
    }
  }
  throw new Error(`${record.name} is not reachable${last ? `: ${errorMessage(last)}` : ''}`, { cause: last })
}

const downloadBun = async (record: RemoteRecord, url: string, target: string): Promise<BunDownload> => {
  const response = await fetch(`${url.replace(/\/+$/, '')}${hostPaths.bun}?target=${encodeURIComponent(target)}`, {
    headers: bearer(record.key),
    signal: AbortSignal.timeout(bunWait),
  })
  if (response.status === 401 || response.status === 403) throw new Error(`${record.name} did not accept this PC`)
  if (!response.ok) throw new Error((await response.text().catch(() => '')) || `HTTP ${response.status}`)
  const version = response.headers.get('x-sand-bun-version')
  const sha256 = response.headers.get('x-sand-bun-sha256')
  if (!version || !sha256) throw new Error(`${record.name} did not send its Bun version`)
  return { version, sha256, bytes: await response.bytes() }
}

const pcSource = (record: RemoteRecord, wait: number): UpdateSource => ({
  id: `pc:${record.id}`,
  name: record.name,
  latest: async () => (await reach(record, wait)).identity.build,
  download: async () => {
    const { url } = await reach(record, wait)
    return (await downloadBundle(url, { key: record.key })).bytes
  },
  bun: async target => downloadBun(record, (await reach(record, wait)).url, target),
})

export const pcSources = async (home: string, wait = 3000): Promise<UpdateSource[]> =>
  (await remoteStore(home)).list().map(record => pcSource(record, wait))
