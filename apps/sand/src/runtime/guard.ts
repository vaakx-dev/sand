import { errorMessage } from '@sand/kit'
import type { Context } from 'drydock'

const report = (kind: string) => (error: unknown) => console.error(`runtime kept running after an ${kind}: ${errorMessage(error)}`, error)

export const guardCrashes = (ctx: Context) =>
  ctx.effect(() => {
    const rejection = report('unhandled rejection')
    const exception = report('uncaught exception')
    process.on('unhandledRejection', rejection)
    process.on('uncaughtException', exception)
    return () => {
      process.off('unhandledRejection', rejection)
      process.off('uncaughtException', exception)
    }
  })
