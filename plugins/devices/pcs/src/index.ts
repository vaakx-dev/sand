import {
  type DeviceRecord,
  devicesChange,
  devicesList,
  helloDevice,
  pcHello,
  pcs,
  pcsChange,
  type ThreadPcs,
  threadPcs,
  wire,
  wireHello,
} from '@sand/devices-contract'
import { definePlugin } from 'drydock'
import { coalesced } from './changes'
import { createFleet } from './fleet/fleet'
import { browserKeys } from './keys'
import { homePcId } from './page/home'
import { createPairing } from './pairing/pairing'
import { createPcs } from './pcs'
import { createWire } from './wire/wire'

export default definePlugin({
  name: 'pcs',
  description:
    "Connects the page to the PC that served it and to your other PCs over each one's closest working route (directly or through the home PC), pairs this browser from #pair links and join requests, and routes every call to the PC it belongs on",
  apply(ctx) {
    const keys = browserKeys()
    const home = homePcId()
    let threads: ThreadPcs | undefined
    ctx.watch(threadPcs, found => {
      threads = found
    })
    const changed = coalesced(ctx, () => ctx.emit(pcsChange))

    const pairing = createPairing({ keys, reconnect: () => fleet.retry(), changed })
    ctx.effect(() => () => pairing.close())

    const records = (list: DeviceRecord[]) => {
      fleet.sync(list)
      pairing.records(list)
    }

    const fleet = createFleet({
      home,
      signer: keys.signer,
      since: pc => threads?.since(pc),
      greeted(pc, retagged) {
        if (pc === home) {
          pairing.greeted(fleet.hello(helloDevice, home))
          void fleet.connection(home).call(devicesList, {}).then(records, () => {})
        }
        ctx.emit(pcHello, pc, retagged)
        if (pc === home) ctx.emit(wireHello)
        changed()
      },
      changed() {
        pairing.homeChanged(fleet.connection(home).status())
        changed()
      },
    })
    ctx.effect(() => () => fleet.close())
    ctx.effect(() => fleet.on(devicesChange, records))

    ctx.provide(wire, createWire(fleet, () => threads))
    ctx.provide(pcs, createPcs(fleet, pairing))
  },
})
