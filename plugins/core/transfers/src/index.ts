import { cli } from '@sand/config/contract'
import { peers } from '@sand/devices-contract'
import { server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import { definePlugin } from 'drydock'
import { join } from 'node:path'
import { transferPath } from './chunks'
import { transfersCopy, transfers as transfersService, transfersOffer, transfersPull, transfersSave, transfersStatus } from './contract'
import { copyBetween } from './copy/copy'
import { offerPath } from './copy/offer'
import { saveFrom } from './copy/save'
import { pullFrom } from './pull'
import { transferRoute } from './route'
import { createTransfers } from './transfers'

const sweepEvery = 60_000

export default definePlugin({
  name: 'transfers',
  description: 'Moves big files between the page, the CLI and PCs in raw HTTP chunks, and copies files and folders between PCs',
  inject: { cli },
  apply(ctx) {
    const { home } = ctx.cli
    const linked = () => ctx.get(peers)
    const transfers = createTransfers(join(home, 'transfers'))
    const offer = offerPath(transfers)
    const save = saveFrom(transfers, linked)
    const copy = copyBetween({ home, linked, offer, save })
    ctx.provide(transfersService, { ...transfers, copy })
    ctx.effect(() => {
      const sweep = () => void transfers.sweep().catch(error => ctx.report(error))
      sweep()
      const timer = setInterval(sweep, sweepEvery)
      return () => clearInterval(timer)
    })
    ctx.watch(server, found =>
      found
        ? joinDisposers(
            found.route(transferPath, transferRoute(transfers)),
            found.handle(transfersPull, pullFrom(transfers, linked)),
            found.handle(transfersStatus, ({ transfer }) => transfers.arrived(transfer)),
            found.handle(transfersOffer, offer),
            found.handle(transfersSave, save),
            found.handle(transfersCopy, copy),
          )
        : undefined,
    )
  },
})
