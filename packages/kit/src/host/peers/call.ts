import type { RemoteRecord, WireRequest } from '@sand/protocol'
import { errorMessage } from '../../text/error'
import { peerSocketUrl } from './reach'
import { askOnce, PeerError, type WireSocket } from './socket'

export const callPeer = async (record: RemoteRecord, request: WireRequest, sockets: Set<WireSocket>, timeout?: number): Promise<unknown> => {
  try {
    return await askOnce(() => peerSocketUrl(record), request, timeout, sockets)
  } catch (error) {
    throw error instanceof PeerError ? error : new PeerError('unreachable', `${record.name} is not reachable: ${errorMessage(error)}`)
  }
}
