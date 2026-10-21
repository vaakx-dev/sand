import type { MenuSpec } from '@sand/ui-kit/contract'
import { fleetAction, pcActionKind } from '../actions'
import type { Fleet, PcView } from '../fleet/model'
import { versionText } from '../fleet/text'

export const pcMenu = (pc: PcView, fleet: Fleet): MenuSpec => {
  const kind = pcActionKind(pc)
  return {
    title: pc.name,
    subtitle: versionText(pc.state?.current, fleet.target.get()) || undefined,
    actions: kind ? [fleetAction(fleet, pc.key, kind)] : [],
  }
}
