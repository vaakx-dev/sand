import type { PcInfo } from '@sand/protocol'
import { ago, badge, div, dot, dynamicChild, icon, quietButton, rowAction, secondaryAction, show, span, tile, type Sig, type Tone } from '@sand/dom'
import { routeKind } from '@sand/kit'

export interface PcRow {
  pc: PcInfo
  self: boolean
  shares: string[]
}

export interface PcRowActions {
  health(open: Sig<boolean>): HTMLElement
  remove(): void
  pairAgain(): void
}

const systems: Record<string, string> = { win32: 'Windows', linux: 'Linux', darwin: 'macOS' }

const network = (url?: string) => {
  if (!url) return undefined
  const kind = routeKind(url)
  return kind === 'tailscale' ? 'Tailscale' : kind === 'local' ? 'this computer' : 'home wifi'
}

const seen = (at?: number) => {
  if (!at) return 'Offline'
  const since = ago(at)
  return since === 'now' ? 'Last seen just now' : `Last seen ${since} ago`
}

const statusText = ({ pc, self }: PcRow) => {
  if (self) return ['This PC', pc.platform && systems[pc.platform]].filter(Boolean).join(' · ')
  if (!pc.checked) return 'Checking…'
  return pc.online ? ['Online', network(pc.url)].filter(Boolean).join(' · ') : seen(pc.lastSeen)
}

const tone = ({ pc, self }: PcRow): Tone => {
  if (self) return 'success'
  if (pc.pairing === 'refused') return 'warning'
  return pc.checked && pc.online ? 'success' : 'neutral'
}

const problem = (pc: PcInfo) =>
  pc.pairing === 'refused' ? `${pc.name} no longer accepts this PC.` : `Pairing with ${pc.name} isn't finished, so it only works one way.`

const pairingNote = (pc: PcInfo, pairAgain: () => void) =>
  div(
    { class: 'mx-4 mb-3 flex flex-wrap items-center gap-3 rounded-lg bg-warning-950 px-3 py-2' },
    span({ class: 'min-w-0 flex-1 text-xs text-warning-400' }, problem(pc)),
    secondaryAction({ size: 'sm', onClick: pairAgain }, 'Pair again'),
  )

const controls = (row: Sig<PcRow>, open: Sig<boolean>, actions: PcRowActions) => [
  quietButton({ size: 'sm', active: open, 'aria-expanded': open, onClick: () => open.set(!open.get()) }, 'Health'),
  row.get().self ? null : rowAction({ label: 'Remove', danger: true, run: actions.remove }),
]

const sharesChip = (shares: string[]) => (shares.length ? badge('accent', `Shares ${shares.join(', ')}`) : span({ class: 'hidden' }))

export const pcRow = (row: Sig<PcRow>, now: Sig<number>, open: Sig<boolean>, actions: PcRowActions) =>
  div(
    { class: 'flex flex-col bg-neutral-900' },
    div(
      { class: 'flex min-h-12 flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3' },
      tile(icon('laptop', 16)),
      div(
        { class: 'flex min-w-32 flex-1 flex-col' },
        span({ class: 'truncate text-sm font-medium text-neutral-100' }, () => row.get().pc.name),
        span(
          { class: 'flex min-w-0 items-center gap-2 text-xs text-neutral-500', title: () => row.get().pc.error ?? '' },
          dynamicChild(row.map(tone), dot),
          span({ class: 'truncate' }, () => {
            now.get()
            return statusText(row.get())
          }),
        ),
      ),
      div(
        { class: 'flex shrink-0 flex-wrap items-center gap-2' },
        dynamicChild(row.map(current => current.shares.join(', ')), () => sharesChip(row.get().shares)),
        ...controls(row, open, actions),
      ),
    ),
    dynamicChild(row.map(current => (current.self ? 'paired' : current.pc.pairing)), pairing => (pairing === 'paired' ? span({ class: 'hidden' }) : pairingNote(row.get().pc, actions.pairAgain))),
    show(open, () => actions.health(open)),
  )
