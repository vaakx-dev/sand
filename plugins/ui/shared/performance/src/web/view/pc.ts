import type { PcView } from '@sand/devices-contract'
import type { Kit } from '@sand/ui-kit/contract'
import { div, section, type Sig, span } from '@vaakx-dev/vrui'
import type { PcReport } from '../../contract'
import { amount, clockTime, platformName, share, wholeShare } from '../format'
import type { Heard } from '../model'
import { band } from './band'
import { chart } from './chart'
import { usageTable, type Where } from './table'

interface Tile {
  label: string
  figure: string
  detail: string
  line?: string
  edge?: string
}

const DIVIDER = 'border-r border-neutral-800'

const tile = ({ label, figure, detail, line, edge }: Tile) =>
  div(
    { class: ['relative min-w-0 px-3 py-3 sm:px-4', edge] },
    div({ class: 'truncate text-xs font-semibold tracking-wider text-neutral-500 uppercase' }, label),
    div({ class: 'mt-2 truncate font-mono text-xl font-semibold text-neutral-100 tabular-nums' }, figure),
    div({ class: 'mt-1 truncate text-xs text-neutral-500' }, detail),
    line ? span({ class: ['absolute inset-x-4 bottom-0 h-px', line] }) : null,
  )

const tiles = ({ cpu, cores, totalBytes, freeBytes }: PcReport) =>
  div(
    { class: 'grid grid-cols-3 border-b border-neutral-800' },
    tile({ label: 'CPU', figure: share(cpu), detail: `${cores} cores`, line: 'bg-neutral-600', edge: DIVIDER }),
    tile({ label: 'Memory', figure: amount(totalBytes - freeBytes), detail: `${wholeShare(1 - freeBytes / totalBytes)} of ${amount(totalBytes)}`, line: 'bg-sky-500', edge: DIVIDER }),
    tile({ label: 'Free', figure: amount(freeBytes), detail: `${wholeShare(freeBytes / totalBytes)} of memory` }),
  )

const metaOf = (pc: PcView, report: PcReport) => [pc.home ? 'This PC' : '', platformName(pc.platform), amount(report.totalBytes)].filter(Boolean).join(' · ')

const silence = (heard: Heard) => span({ class: 'ml-auto shrink-0 text-xs text-warning-400' }, `Not answering since ${clockTime(heard.failed ?? heard.at)}`)

export const pcCard = (kit: Kit, pc: PcView, heard: Heard, { silent, open, where }: { silent: boolean; open: Sig<ReadonlySet<string>>; where: Where }) =>
  section(
    { class: 'flex min-w-0 flex-col overflow-hidden rounded-lg border border-neutral-800', 'aria-label': pc.name },
    band(
      'flex items-baseline gap-2',
      span({ class: 'truncate text-sm font-semibold text-neutral-100' }, pc.name),
      span({ class: 'truncate text-xs text-neutral-500' }, metaOf(pc, heard.report)),
      silent ? silence(heard) : null,
    ),
    tiles(heard.report),
    chart(heard.report.bars),
    usageTable(kit, heard.report, { open, where }),
  )

export const offRow = (kit: Kit, pc: PcView) =>
  div(
    { class: 'flex items-center gap-3 rounded-lg border border-neutral-800 px-4 py-3 text-sm text-neutral-500' },
    span({ class: 'inline-flex shrink-0' }, kit.icon('laptop', 14)),
    span({ class: 'font-semibold text-neutral-400' }, pc.name),
    span({}, [platformName(pc.platform), 'off'].filter(Boolean).join(' · ')),
    pc.seen ? span({ class: 'ml-auto flex items-center gap-1.5 text-xs' }, 'last seen', kit.age(pc.seen)) : null,
  )
