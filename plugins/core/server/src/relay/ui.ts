import type { PickItem, PickOptions, UI } from '../contract'
import { reportText } from '@sand/kit'
import { existsSync } from 'node:fs'
import { info } from '../socket/serialize'
import { invocation } from './invocation'
import { tell } from './peer'
import type { RelayState } from './state'

export const relayUI = (state: RelayState): UI => {
  const { contributions, peers, picks } = state
  const target = () => {
    const current = invocation.getStore()
    return current && peers.has(current.peer.socket) ? current : undefined
  }

  return {
    command: command => contributions.commands.add(command.name, command),
    notify(text, level) {
      const current = target()
      if (current) return tell(current.peer, 'ui.notify', text, level)
      if (!peers.size) {
        if (level === 'error') console.error(text)
        else console.log(text)
        return
      }
      for (const peer of peers.values()) tell(peer, 'ui.notify', text, level)
    },
    report(title, rows) {
      const current = target()
      if (current) return tell(current.peer, 'ui.report', title, rows)
      if (!peers.size) return void console.log(reportText(title, rows))
      for (const peer of peers.values()) tell(peer, 'ui.report', title, rows)
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
      tell(current.peer, 'ui.open', session ? { info: info(session), entries: session.entries() } : null, draft, cwd)
    },
    attach(content) {
      const current = target()
      if (current) tell(current.peer, 'ui.attach', content)
    },
    prepare(patch) {
      const current = target()
      if (current) tell(current.peer, 'ui.prepare', patch)
    },
    draft: () => invocation.getStore()?.settings,
  }
}
