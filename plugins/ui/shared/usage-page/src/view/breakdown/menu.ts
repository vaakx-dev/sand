import type { MenuSpec } from '@sand/ui-kit/contract'
import type { PcUsage } from '../../data/types'
import type { RowSource } from './rows'

export const pcMenu = (pc: PcUsage, source: RowSource) =>
  source.usage.pcs.length > 1
    ? (): MenuSpec => ({ title: pc.name, actions: [{ id: 'only', label: 'Show only this PC', icon: 'monitor', run: () => source.showOnly(pc.id) }] })
    : undefined
