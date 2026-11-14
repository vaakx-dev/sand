import type { Kit } from '@sand/ui-kit/contract'
import { derive, dynamicChild, span } from '@vaakx-dev/vrui'
import { awayChip } from './away'
import type { Plus } from './entries'
import { plusMenu, type Picking } from './menu'

const openPanel = (kit: Kit, { entries }: Plus) => {
  const shown = derive(() => entries.get().find(entry => entry.open.get()))
  return dynamicChild(shown, entry => (entry ? kit.chipPopover(() => entry.open.set(false), { class: 'left-0' }, entry.panel()) : null))
}

export const plusView = (kit: Kit, plus: Plus, picking: Picking) =>
  span({ class: 'relative flex min-w-0 shrink items-center gap-1' }, ...plusMenu(kit, plus, picking), awayChip(kit, plus), openPanel(kit, plus))
