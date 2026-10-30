import { cli } from '@sand/config/contract'
import { peers } from '@sand/devices-contract'
import { server } from '@sand/server/contract'
import { tools } from '@sand/tools/contract'
import { joinDisposers } from '@sand/util'
import { definePlugin } from 'drydock'
import { join } from 'node:path'
import { transferPath } from './chunks'
import { transfers as transfersService, transfersOffer, transfersPull, transfersSave, transfersStatus } from './contract'
import { offerPath } from './copy/offer'
import { saveFrom } from './copy/save'
import { group, pcTools } from './copy/tools'
import { pullFrom } from './pull'
import { transferRoute } from './route'
import { createTransfers } from './transfers'

const sweepEvery = 60_000

export default definePlugin({
  name: 'transfers',
  description: 'Moves big files between the page, the CLI and PCs in raw HTTP chunks, and lets the agent copy files and folders between PCs',
  inject: { cli },
  apply(ctx) {
    const { home } = ctx.cli
    const linked = () => ctx.get(peers)
    const transfers = createTransfers(join(home, 'transfers'))
    ctx.provide(transfersService, transfers)
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
            found.handle(transfersOffer, offerPath(transfers)),
            found.handle(transfersSave, saveFrom(transfers, linked)),
          )
        : undefined,
    )
    ctx.watch(tools, found =>
      found
        ? joinDisposers(
            found.group({ name: group, label: 'PCs', summary: 'list your PCs and copy files and folders between them', load: 'on-demand' }),
            ...pcTools(home, transfers, linked).map(tool => found.register(tool)),
          )
        : undefined,
    )
  },
})
