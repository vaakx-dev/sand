import type { SessionSettings } from '@sand/model/contract'
import type { WireRequest } from '@sand/protocol'
import { invocation, type Peer } from './peer'
import type { RelayState } from './relay'

interface Target {
  session?: string
  cwd?: string
  settings?: SessionSettings
}

const within = <T>(state: RelayState, peer: Peer, { session, cwd, settings }: Target, run: () => T) => {
  const opened = session ? state.ctx.sessions.open(session) : undefined
  peer.focus = opened
  return invocation.run({ peer, session: opened, cwd, settings }, run)
}

export const answerRelay = async (state: RelayState, peer: Peer, request: WireRequest, fallback: () => Promise<unknown>) => {
  switch (request.type) {
    case 'ui.command': {
      const command = state.commands.get(request.name)
      if (!command) throw new Error(`The server has no /${request.name} command`)
      await within(state, peer, request, () => command.run(request.args))
      return true
    }
    case 'ui.pick.result':
      return state.picks.answerPick(peer, request.pick, { index: request.index, action: request.action, query: request.query })
    case 'ui.input.result':
      return state.picks.answerInput(peer, request.input, request.value)
    case 'ui.focus':
      within(state, peer, request, () => {})
      return true
    default:
      return fallback()
  }
}
