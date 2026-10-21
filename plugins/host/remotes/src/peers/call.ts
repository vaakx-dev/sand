import type { Request } from '@sand/host-hub/contract'
import { errorMessage } from '@sand/util'
import { askOnce, PeerError, type WireSocket } from '@sand/util/boot'
import type { RemoteRecord } from '../contract'
import { peerSocketUrl } from './reach'

export const callPeer = async <I, O>(record: RemoteRecord, request: Request<I, O>, input: I, sockets: Set<WireSocket>, timeout?: number): Promise<O> => {
  try {
    return await askOnce(() => peerSocketUrl(record), request, input, timeout, sockets)
  } catch (error) {
    throw error instanceof PeerError ? error : new PeerError('unreachable', `${record.name} is not reachable: ${errorMessage(error)}`)
  }
}
