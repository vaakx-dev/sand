import type { WireRequest } from '@sand/protocol'
import type { ServerContext } from '../context'
import { Contributions } from './contributions'
import { tell, type Peer, type Socket } from './peer'
import { Picks } from './picks'
import { answerRelay } from './requests'
import type { RelayState } from './state'
import { relayUI } from './ui'

const later = (run: () => void, ms: number) => {
  let timer: Timer | undefined
  return {
    schedule: () => {
      clearTimeout(timer)
      timer = setTimeout(run, ms)
    },
    cancel: () => clearTimeout(timer),
  }
}

export const createRelay = (ctx: ServerContext) => {
  const peers = new Map<Socket, Peer>()
  const picks = new Picks()

  const advertise = later(() => {
    const described = contributions.describe()
    for (const peer of peers.values()) tell(peer, 'ui.relay', described)
  }, 20)
  const contributions = new Contributions(advertise.schedule)
  const state: RelayState = { ctx, peers, picks, contributions }

  ctx.effect(() => () => {
    advertise.cancel()
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
