import { cli } from '@sand/config/contract'
import { orchestrator } from '@sand/orchestrator/contract'
import { turns } from '@sand/turns-contract/contract'
import { definePlugin } from 'drydock'
import { createPrinter } from './print/printer'
import { readFlags } from './run/flags'
import { runPrompt } from './run/run'

export default definePlugin({
  name: 'print',
  inject: { cli },
  apply(ctx) {
    const { prompt, args, exit } = ctx.cli
    if (!prompt) return
    const printer = createPrinter()

    const controller = new AbortController()
    const { signal } = controller
    ctx.effect(() => {
      const abort = () => controller.abort()
      process.on('SIGINT', abort)
      return () => {
        process.off('SIGINT', abort)
        abort()
      }
    })

    const start = async () => {
      const flags = readFlags(args)
      await ctx.settled()
      const agent = ctx.get(turns)
      const threads = ctx.get(orchestrator)
      if (!agent || !threads) throw new Error('no plugin provides the agent loop and threads, so sand cannot answer')
      return runPrompt(ctx, { threads, turns: agent, printer, prompt, flags, signal })
    }
    start().then(exit, error => {
      printer.error(error)
      exit(signal.aborted ? 130 : 1)
    })
  },
})
