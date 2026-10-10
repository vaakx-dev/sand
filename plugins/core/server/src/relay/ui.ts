import type { PickItem, PickOptions, UI } from '../contract'
import { reportText } from '@sand/kit'
import { existsSync } from 'node:fs'
import { tailOf } from '../requests/paging'
import { info } from '../socket/serialize'
import { invocation, tell, type Peer } from './peer'
import type { RelayState } from './relay'

export const relayUI = ({ ctx, peers, picks, commands }: RelayState): UI => {
  const target = () => {
    const current = invocation.getStore()
    return current && peers.has(current.peer.socket) ? current : undefined
  }

  const toTarget = (send: (peer: Peer) => void) => {
    const current = target()
    if (current) send(current.peer)
  }

  const toTargetOrAll = (send: (peer: Peer) => void, unseen: () => void) => {
    const current = target()
    if (current) return send(current.peer)
    if (!peers.size) return unseen()
    for (const peer of peers.values()) send(peer)
  }

  return {
    command: command => commands.add(command),
    notify(text, level) {
      const print = level === 'error' ? console.error : console.log
      toTargetOrAll(
        peer => tell(peer, 'ui.notify', text, level),
        () => print(text),
      )
    },
    report(title, rows) {
      toTargetOrAll(
        peer => tell(peer, 'ui.report', title, rows),
        () => console.log(reportText(title, rows)),
      )
    },
    async pick<T>(title: string, items: PickItem<T>[], options?: PickOptions) {
      const current = target()
      if (!current || !items.length) return undefined
      return (await picks.choose(current.peer, title, items, options))?.value
    },
    choose<T>(title: string, items: PickItem<T>[], options?: PickOptions) {
      const current = target()
      return current ? picks.choose(current.peer, title, items, options) : Promise.resolve(undefined)
    },
    input(title, value) {
      const current = target()
      return current ? picks.input(current.peer, title, value) : Promise.resolve(undefined)
    },
    session: () => invocation.getStore()?.session,
    cwd: () => {
      const current = invocation.getStore()
      const cwd = current?.cwd || current?.session?.cwd || ''
      return cwd && existsSync(cwd) ? cwd : ''
    },
    open(session, draft, cwd) {
      const current = target()
      if (!current) return
      current.session = session
      current.peer.focus = session
      if (!session) return tell(current.peer, 'ui.open', null, draft, cwd)
      tailOf(ctx, session)
        .then(tail => {
          if (current.peer.focus?.id === session.id) tell(current.peer, 'ui.open', { info: info(session), ...tail }, draft, cwd)
        })
        .catch(error => ctx.report(error))
    },
    attach: content => toTarget(peer => tell(peer, 'ui.attach', content)),
    prepare: patch => toTarget(peer => tell(peer, 'ui.prepare', patch)),
    draft: () => invocation.getStore()?.settings,
  }
}
