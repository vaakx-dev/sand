import { createInvite, errorMessage, fetchHostIdentity, parsePairLink, requestTicket, routeKind } from '@sand/kit'
import type { RemoteInvite, RemoteRecord } from '@sand/protocol'
import { remoteUrls } from './urls'

const identityTimeout = 3000

const routesOf = (links: string[]) =>
  links.flatMap(link => {
    const url = parsePairLink(link)?.url
    return url && routeKind(url) !== 'local' ? [url] : []
  })

const rejectedAt = async (url: string, key: string) => {
  try {
    return !(await requestTicket(url, key))
  } catch {
    return false
  }
}

const rejected = async (urls: string[], key: string) => {
  for (const url of urls) if (await rejectedAt(url, key)) return true
  return false
}

export const inviteAt = async (record: RemoteRecord, learned: (urls: string[]) => void): Promise<RemoteInvite> => {
  const matched: string[] = []
  let last = 'no address to try'
  for (const url of remoteUrls(record)) {
    try {
      const identity = await fetchHostIdentity(url, identityTimeout)
      if (identity.deviceId !== record.id) {
        last = 'reached a different PC'
        continue
      }
      matched.push(url)
      const invite = await createInvite(url, record.key)
      learned(routesOf(invite.links))
      return { secret: invite.secret, url }
    } catch (error) {
      last = errorMessage(error)
    }
  }
  if (await rejected(matched, record.key)) throw new Error(`${record.name} no longer accepts this PC; pair it again`)
  throw new Error(`${record.name} is not reachable: ${last}`)
}
