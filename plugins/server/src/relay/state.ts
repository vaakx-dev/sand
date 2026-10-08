import type { ServerContext } from '../context'
import type { Contributions } from './contributions'
import type { Peer, Socket } from './peer'
import type { Picks } from './picks'

export interface RelayState {
  ctx: ServerContext
  peers: Map<Socket, Peer>
  picks: Picks
  contributions: Contributions
}
