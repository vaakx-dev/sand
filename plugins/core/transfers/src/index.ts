import { cli } from '@sand/config/contract'
import { server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import { definePlugin } from 'drydock'
import { join } from 'node:path'
import { transferPath } from './chunks'
import { transfers as transfersService, transfersPull, transfersStatus } from './contract'
import { pullFrom } from './pull'
import { transferRoute } from './route'
import { createTransfers } from './transfers'

const sweepEvery = 60_000

export default definePlugin({
  name: 'transfers',
  description: 'Moves big files between the page, the CLI and PCs in raw HTTP chunks',
  inject: { cli },
  apply(ctx) {
    const transfers = createTransfers(join(ctx.cli.home, 'transfers'))
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
            found.handle(transfersPull, pullFrom(ctx.cli.home, transfers)),
            found.handle(transfersStatus, ({ transfer }) => transfers.arrived(transfer)),
          )
        : undefined,
    )
  },
})
