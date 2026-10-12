import { joinDisposers } from '@sand/kit'
import { definePlugin } from 'drydock'
import { join } from 'node:path'
import { transferPath } from '@sand/kit/transfers'
import { pullFrom } from './pull'
import { transferRoute } from './route'
import { createTransfers } from './transfers'

const sweepEvery = 60_000

export default definePlugin({
  name: 'transfers',
  description: 'Moves big files between the page, the CLI and PCs in raw HTTP chunks',
  inject: ['cli'],
  uses: { server: 'files cannot be sent or received' },
  apply(ctx) {
    const transfers = createTransfers(join(ctx.cli.home, 'transfers'))
    ctx.provide('transfers', transfers)
    ctx.effect(() => {
      const sweep = () => void transfers.sweep().catch(error => ctx.report(error))
      sweep()
      const timer = setInterval(sweep, sweepEvery)
      return () => clearInterval(timer)
    })
    ctx.watch('server', server =>
      server
        ? joinDisposers(
            server.route(transferPath, transferRoute(transfers)),
            server.handle({
              'transfers.pull': pullFrom(ctx.cli.home, transfers),
              'transfers.status': ({ transfer }) => transfers.arrived(transfer),
            }),
          )
        : undefined,
    )
  },
})
