import type { WireRequest } from '@sand/protocol'
import type { ServerContext } from '../context'
import type { Socket } from '../socket/sockets'
import { createCommands, type Commands } from './commands'
import { tell, type Peer } from './peer'
import { createPicks, type Picks } from './picks'
import { answerRelay } from './requests'
import { relayUI } from './ui'

const advertiseDelay = 20

export interface RelayState {
  ctx: ServerContext
  peers: Map<Socket, Peer>
  picks: Picks
  commands: Commands
}

export const createRelay = (ctx: ServerContext) => {
  const peers = new Map<Socket, Peer>()
  const picks = createPicks()
  let advertising: Timer | undefined

  const advertise = () => {
    clearTimeout(advertising)
    advertising = setTimeout(() => {
      const contributions = commands.contributions()
      for (const peer of peers.values()) tell(peer, 'ui.relay', contributions)
    }, advertiseDelay)
  }

  const commands = createCommands(advertise)
  const state: RelayState = { ctx, peers, picks, commands }

  ctx.on('server.hello', hello => ({ ...hello, relay: commands.contributions() }))
  ctx.effect(() => () => {
    clearTimeout(advertising)
    picks.drop()
  })

  return {
    ui: relayUI(state),
    join: (socket: Socket) => void peers.set(socket, { socket }),
    leave(socket: Socket) {
      const peer = peers.get(socket)
      peers.delete(socket)
      if (peer) picks.drop(peer)
    },
    answer(socket: Socket, request: WireRequest, fallback: () => Promise<unknown>) {
      const peer = peers.get(socket)
      return peer ? answerRelay(state, peer, request, fallback) : fallback()
    },
  }
}
