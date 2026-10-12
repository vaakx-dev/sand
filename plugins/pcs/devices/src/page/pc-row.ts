import type { PcInfo } from '@sand/host-remotes/contract'
import { ago, routeKind } from '@sand/kit'
import type { Kit, Tone } from '@sand/ui-kit/contract'
import { div, dynamicChild, show, sig, type Sig } from '@vaakx-dev/vrui'
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

const statusText = ({ pc, self }: PcRow) => {
  if (self) return ['This PC', pc.platform && systems[pc.platform]].filter(Boolean).join(' · ')
  if (!pc.checked) return 'Checking…'
  if (!pc.online) return seen(pc.lastSeen)
  return ['Online', pc.url && networks[routeKind(pc.url)]].filter(Boolean).join(' · ')
}

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
  const { badge, contextMenu, icon, itemRow, quietButton, rowAction, rowWarning, secondaryAction, tile } = kit
  const open = sig(false)
  const menu = contextMenu()
  return div(
    { class: 'flex flex-col bg-neutral-900' },
    menu.view(),
    itemRow(
      menu.target(() => pcMenu(row.get(), actions)),
      tile(icon('laptop', 16)),
      () => row.get().pc.name,
      pcStatus(kit, row, now),
      dynamicChild(
        row.map(current => current.shares.join(', ')),
        shares => (shares ? badge('accent', `Shares ${shares}`) : null),
      ),
      quietButton({ size: 'sm', active: open, 'aria-expanded': () => String(open.get()), onClick: open.toggle() }, 'Health'),
      row.get().self ? null : rowAction({ label: 'Remove', danger: true, run: actions.remove }),
    ),
    dynamicChild(
      row.map(current => (current.self ? 'paired' : current.pc.pairing)),
      pairing => (pairing === 'paired' ? null : rowWarning(problem(row.get().pc), secondaryAction({ size: 'sm', onClick: actions.pairAgain }, 'Pair again'))),
    ),
    show(open, actions.health),
  )
}
