import type { cli } from '@sand/config/contract'
import { errorMessage } from '@sand/util'
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

export const exitOnSignals = (ctx: Context<{ cli: typeof cli }>) =>
  ctx.effect(() => {
    const stop = () => ctx.cli.exit(0)
    process.on('SIGINT', stop)
    process.on('SIGTERM', stop)
    return () => {
      process.off('SIGINT', stop)
      process.off('SIGTERM', stop)
    }
  })
