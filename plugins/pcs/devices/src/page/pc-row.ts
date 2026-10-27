import type { PcInfo } from '@sand/host-remotes/contract'
import { routeKind } from '@sand/host-remotes/pairing'
import type { Kit, Tone } from '@sand/ui-kit/contract'
import { ago } from '@sand/util'
import { dynamicChild, show, sig, type Sig } from '@vaakx-dev/vrui'
import { pcMenu } from './pc-menu'

export interface PcRow {
  pc: PcInfo
  self: boolean
  shares: string[]
}

export interface PcRowActions {
  health(): HTMLElement
  remove(): void
  pairAgain(): void
  check(): void
  repair(): void
  busy(): boolean
}

const systems: Record<string, string> = { win32: 'Windows', linux: 'Linux', darwin: 'macOS' }

const networks = { tailscale: 'Tailscale', local: 'this computer', lan: 'home wifi' }

const seen = (at?: number) => {
  if (!at) return 'Offline'
  const since = ago(at)
  return since === 'now' ? 'Last seen just now' : `Last seen ${since} ago`
}

const reachText = ({ pc, self }: PcRow) => {
  if (self) return ['This PC', pc.platform && systems[pc.platform]]
  if (!pc.checked) return ['Checking…']
  if (!pc.online) return [seen(pc.lastSeen)]
  return ['Online', pc.url && networks[routeKind(pc.url)]]
}

const statusText = (row: PcRow) =>
  [...reachText(row), row.shares.length && `Shares ${row.shares.join(', ')}`].filter(Boolean).join(' · ')

const tone = ({ pc, self }: PcRow): Tone => {
  if (self) return 'success'
  if (pc.pairing === 'refused') return 'warning'
  return pc.checked && pc.online ? 'success' : 'neutral'
}

const problem = (pc: PcInfo) =>
  pc.pairing === 'refused' ? `${pc.name} no longer accepts this PC.` : `Pairing with ${pc.name} isn't finished, so it only works one way.`

const pcStatus = ({ dot, statusLine }: Kit, row: Sig<PcRow>, now: Sig<number>) =>
  statusLine({
    mark: dynamicChild(row.map(tone), dot),
    text: () => {
      now.get()
      return statusText(row.get())
    },
    title: () => row.get().pc.error ?? '',
  })

export const pcRow = (kit: Kit, row: Sig<PcRow>, now: Sig<number>, actions: PcRowActions) => {
  const { contextMenu, expandRow, expandToggle, rowAction, rowWarning, secondaryAction, settingsRow } = kit
  const open = sig(false)
  const menu = contextMenu()
  return expandRow(
    {},
    menu.view(),
    settingsRow(
      {
        ...menu.target(() => pcMenu(row.get(), actions)),
        title: () => row.get().pc.name,
        detail: pcStatus(kit, row, now),
      },
      expandToggle(open, 'Health'),
      row.get().self ? null : rowAction({ label: 'Remove', danger: true, run: actions.remove }),
    ),
    dynamicChild(
      row.map(current => (current.self ? 'paired' : current.pc.pairing)),
      pairing => (pairing === 'paired' ? null : rowWarning(problem(row.get().pc), secondaryAction({ size: 'sm', onClick: actions.pairAgain }, 'Pair again'))),
    ),
    show(open, actions.health),
  )
}
