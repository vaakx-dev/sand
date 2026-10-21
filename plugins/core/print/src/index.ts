import { sessions } from '@sand/chats/contract'
import { cli } from '@sand/config/contract'
import { loop } from '@sand/loop/contract'
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
      const agent = ctx.get(loop)
      const store = ctx.get(sessions)
      if (!agent || !store) throw new Error('no plugin provides the agent loop and the chat store, so sand cannot answer')
      return runPrompt(ctx, { loop: agent, sessions: store, printer, prompt, flags, signal })
    }
    start().then(exit, error => {
      printer.error(error)
      exit(signal.aborted ? 130 : 1)
    })
  },
})
