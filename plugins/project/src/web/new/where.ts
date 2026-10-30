import type { PcView } from '@sand/devices-contract'
import type { PaletteItem, PalettePage } from '@sand/palette/contract'
import type { ProjectsContext } from '../context'

const platforms: Record<string, string> = { linux: 'Linux', win32: 'Windows', darwin: 'macOS' }

export const isThisPc = (pc: PcView) => pc.status.phase === 'connected' && pc.status.route.kind === 'local'

const describe = (pc: PcView) => {
  if (!pc.online) return 'Offline'
  if (isThisPc(pc)) return 'This PC'
  return [pc.platform && (platforms[pc.platform] ?? pc.platform), pc.address].filter(Boolean).join(' · ')
}

export const pcItem = (pc: PcView, next: (pc: PcView) => PalettePage): PaletteItem => ({
  id: `pc:${pc.id}`,
  icon: isThisPc(pc) ? 'laptop' : 'monitor',
  label: pc.name,
  detail: describe(pc),
  search: isThisPc(pc) ? 'this pc local' : 'other pc',
  disabled: !pc.online,
  page: () => next(pc),
})

export const wherePage = (ctx: ProjectsContext, next: (pc: PcView) => PalettePage): PalettePage => ({
  id: 'where',
  title: 'Where',
  placeholder: 'Search your PCs…',
  empty: 'No matching PCs.',
  items: () => ctx.pcs.list().map(pc => pcItem(pc, next)),
})
