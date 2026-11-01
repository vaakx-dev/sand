import { pcMarks } from '@sand/devices-contract'
import type { Kit } from '@sand/ui-kit/contract'
import { span } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import { awayPcName } from '../palette/places'
import type { PcIcons } from './items'

const plainIcon = (kit: Kit, name: string) => span({ class: 'inline-flex shrink-0 text-neutral-500', title: name }, kit.icon('monitor', 14))

export const awayPcIcons =
  (ctx: Context, kit: Kit): PcIcons =>
  device => {
    const name = awayPcName(ctx, device)
    if (!name) return undefined
    return () => ctx.get(pcMarks)?.icon(device) ?? plainIcon(kit, name)
  }
