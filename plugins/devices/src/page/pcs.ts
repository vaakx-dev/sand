import type { LoginState, PcList } from '@sand/protocol'
import { clock, derive, div, hint, list, settingsSection, show, sig, type Sig } from '@sand/dom'
import type { PcHealthStore } from '../health/state'
import type { DeviceSource } from '../source'
import { healthPanel } from './health'
import { pcRow, type PcRow } from './pc-row'

const ownShares = (login: LoginState | undefined) =>
  login?.accounts.filter(account => account.signedIn && account.shared && !account.env).map(account => (account.method === 'oauth' ? account.subscription : account.label)) ?? []

const sharesOf = (login: LoginState | undefined, id: string) => login?.pcs.find(pc => pc.device === id)?.shares ?? []

const rows = (list: PcList, login: LoginState | undefined): PcRow[] => [
  { pc: { id: list.self.id, name: list.self.name, platform: list.self.platform, pairing: 'paired', online: true, checked: true }, self: true, shares: ownShares(login) },
  ...list.pcs.map(pc => ({ pc, self: false, shares: sharesOf(login, pc.id) })),
]

export const pcsSection = (source: DeviceSource, health: PcHealthStore, pairAgain: () => void) => {
  const now = clock(60_000)
  const opened = new Map<string, Sig<boolean>>()
  const openFlag = (id: string) => opened.get(id) ?? opened.set(id, sig(false)).get(id)!
  const all = derive(() => {
    const current = source.pcs.get()
    return current ? rows(current, source.login.get()) : []
  })
  return settingsSection(
    {},
    show(
      source.pcs.map(current => !current),
      () => div({ class: 'bg-neutral-900' }, hint('Loading…')),
    ),
    list(
      all,
      row => row.pc.id,
      row => {
        const { id, name } = row.get().pc
        const self = row.get().self
        return pcRow(row, now, openFlag(id), {
          health: () => healthPanel({ id, name, local: self, online: row.get().pc.online }, health),
          remove: () => void source.removePc(id).catch(source.fail),
          pairAgain,
        })
      },
      div({ class: 'contents' }),
    ),
  )
}
