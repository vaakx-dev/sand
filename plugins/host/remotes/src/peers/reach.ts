import { errorMessage } from '@sand/util'
import { PeerError, requestTicket, ticketSocketUrl } from '@sand/util/boot'
import type { RemoteRecord } from '../contract'
import { fetchHostIdentity } from '../pairing/auth'
import { remoteUrls } from './store'

const identityTimeout = 10_000

const reasonOf = (error: unknown) => errorMessage(error instanceof AggregateError ? error.errors.at(-1) : error)

export const peerUrl = async (record: Pick<RemoteRecord, 'id' | 'name' | 'url' | 'urls'>) => {
  const probe = async (url: string) => {
    const identity = await fetchHostIdentity(url, identityTimeout)
    if (identity.deviceId !== record.id) throw new Error('reached a different PC')
    return url
  }
  try {
    return await Promise.any(remoteUrls(record).map(probe))
  } catch (error) {
    throw new PeerError('unreachable', `${record.name} is not reachable: ${reasonOf(error)}`)
  }
}

export const peerSocketUrl = async (record: RemoteRecord) => {
  const url = await peerUrl(record)
  const ticket = await requestTicket(url, record.key)
  if (!ticket) throw new PeerError('refused', `${record.name} no longer accepts this PC; pair it again`)
  return ticketSocketUrl(url, ticket.ticket)
}
