import type { PcList } from '@sand/host-remotes/contract'
import type { LoginState } from '@sand/llm-accounts/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { clock, derive, show } from '@vaakx-dev/vrui'
import type { PcHealthStore } from '../health/state'
import type { DeviceSource } from '../source'
import { healthPanel } from './health'
import { pcRow, type PcRow } from './pc-row'

const ownShares = (login: LoginState | undefined) =>
  login?.accounts.filter(account => account.signedIn && account.shared && !account.env).map(account => account.label) ?? []

const sharesOf = (login: LoginState | undefined, id: string) => login?.pcs.find(pc => pc.device === id)?.shares ?? []

const rows = (list: PcList, login: LoginState | undefined): PcRow[] => [
  { pc: { id: list.self.id, name: list.self.name, platform: list.self.platform, pairing: 'paired', online: true, checked: true }, self: true, shares: ownShares(login) },
  ...list.pcs.map(pc => ({ pc, self: false, shares: sharesOf(login, pc.id) })),
]

export const pcsSection = (kit: Kit, source: DeviceSource, health: PcHealthStore, pairAgain: () => void) => {
  const { hintRow, rowList, settingsSection } = kit
  const now = clock(60_000)
  const all = derive(() => {
    const current = source.pcs.get()
    return current ? rows(current, source.login.get()) : []
  })
  return settingsSection(
    {},
    show(
      () => !source.pcs.get(),
      () => hintRow('Loading…'),
    ),
    rowList(
      all,
      row => row.pc.id,
      row => {
        const { id, name } = row.get().pc
        const self = row.get().self
        return pcRow(kit, row, now, {
          health: () => healthPanel(kit, { id, name, local: self, online: row.get().pc.online }, health),
          remove: () => void source.removePc(id).catch(source.fail),
          pairAgain,
          check: () => health.refresh(id, self),
          repair: () => void health.repair(id, name),
          busy: () => health.busy(id),
        })
      },
    ),
  )
}
