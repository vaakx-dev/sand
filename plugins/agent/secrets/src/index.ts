import { cli } from '@sand/config/contract'
import { server } from '@sand/server/contract'
import { tools } from '@sand/tools/contract'
import { joinDisposers } from '@sand/util'
import { definePlugin } from 'drydock'
import { join } from 'node:path'
import { secretDecline, secretSave, secretWaiting } from './contract'
import { secretFiles } from './files'
import { secretTool } from './tool'
import { createWaits } from './waits'

const sweepEvery = 60 * 60_000

export default definePlugin({
  name: 'secrets',
  description: 'request_secret tool: the agent asks the user for a secret in a private card and gets the path of an owner-only file holding it',
  inject: { tools, cli },
  apply(ctx) {
    const files = secretFiles(join(ctx.cli.home, 'secrets'))
    const waits = createWaits()
    ctx.effect(() => waits.cancel)
    ctx.effect(() => {
      const sweep = () => void files.sweep().catch(error => ctx.report(error))
      sweep()
      const timer = setInterval(sweep, sweepEvery)
      return () => clearInterval(timer)
    })
    ctx.effect(() => ctx.tools.register(secretTool(waits)))
    ctx.watch(server, found =>
      found
        ? joinDisposers(
            found.handle(secretWaiting, ({ session, id }) => waits.waiting(session, id)),
            found.handle(secretSave, async ({ session, id, value }) => {
              const settle = waits.answer(session, id)
              settle({ status: 'saved', file: await files.write(value) })
            }),
            found.handle(secretDecline, ({ session, id }) => waits.answer(session, id)({ status: 'declined' })),
          )
        : undefined,
    )
  },
})
