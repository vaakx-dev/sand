import { pcsChange, type PcView, wireHello } from '@sand/devices-contract'
import { pulse } from '@sand/web-client/reactive'
import { clock } from '@vaakx-dev/vrui'
import type { UiContext } from '../inject'
import { devicesData } from './devices'
import { installsData } from './installs'
import { joinsData } from './joins'
import { pcSettings } from './pc-settings'
import { requestsData } from './requests'

export const createData = (ctx: UiContext) => {
  const changes = pulse(ctx, [pcsChange, wireHello])
  const devices = devicesData(ctx)
  const requests = requestsData(ctx)
  const installs = installsData(ctx)
  const joins = joinsData(ctx)
  const home = pcSettings(ctx, ctx.pcs.here().id)
  const now = clock(1000)

  const refresh = () => {
    void devices.refresh()
    void requests.pending.refresh()
    void installs.progress.refresh()
    void joins.outgoing.refresh()
    void home.refresh()
  }
  ctx.on(wireHello, refresh)
  if (ctx.wire.ready()) refresh()

  const read = changes.read

  return {
    changes,
    now,
    devices,
    requests,
    installs,
    joins,
    home,
    homeId: () => ctx.pcs.here().id,
    pcs: read(() => ctx.pcs.list()),
    view: (pc: string) => read((): PcView | undefined => ctx.pcs.get(pc)),
    nameOf: (pc: string) => devices.nameOf(pc) ?? ctx.pcs.name(pc),
    paired: read(() => ctx.pcs.pairing()),
    refresh,
  }
}

export type Data = ReturnType<typeof createData>
