import type { PairLinkRequest, PairLinkResult } from '@sand/host-devices/contract'
import { errorMessage, trimSlash } from '@sand/util'
import { bearer, hostPaths } from '@sand/util/boot/wire'
import type { RemoteRecord } from '../contract'
import { remoteUrls } from '../peers'

const timeout = 5000

export type LinkReply = { kind: 'linked'; url: string; result: PairLinkResult } | { kind: 'refused'; url: string }

const linkAt = async (url: string, record: RemoteRecord, body: PairLinkRequest): Promise<LinkReply | undefined> => {
  const response = await fetch(`${trimSlash(url)}${hostPaths.pairLink}`, {
    method: 'POST',
    headers: { ...bearer(record.key), 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeout),
  })
  if (response.status === 401 || response.status === 403) return { kind: 'refused', url }
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const result = (await response.json()) as PairLinkResult
  return result?.device?.id === record.id ? { kind: 'linked', url, result } : undefined
}

export const callLink = async (record: RemoteRecord, body: PairLinkRequest): Promise<LinkReply> => {
  const failures: string[] = []
  for (const url of remoteUrls(record)) {
    try {
      const reply = await linkAt(url, record, body)
      if (reply) return reply
      failures.push(`${url}: a different PC answered`)
    } catch (error) {
      failures.push(`${url}: ${errorMessage(error)}`)
    }
  }
  throw new Error(failures.join('\n') || 'no address to try')
}
