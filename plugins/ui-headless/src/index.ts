import { definePlugin } from 'drydock'
import { runLocal } from './local/run'
import { createPrinter } from './print/printer'
import { createHeadlessUI } from './ui/service'

export default definePlugin({
  name: 'ui-headless',
  inject: ['cli', 'loop', 'sessions'],
  apply(ctx) {
    const { mode, prompt, cwd, exit } = ctx.cli
    if (mode !== 'print') return
    const printer = createPrinter()
    const ui = createHeadlessUI(printer, cwd, () => ctx.modelSettings?.flags())
    ctx.provide('ui', ui.service)
    if (!prompt) return

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
      await ctx.settled()
      return runLocal(ctx, { printer, ui, prompt, signal })
    }
    start().then(exit, error => {
      printer.error(error)
      exit(signal.aborted ? 130 : 1)
    })
  },
})
