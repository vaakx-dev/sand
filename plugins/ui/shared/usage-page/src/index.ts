import { errorMessage, pulse } from '@sand/dom'
import { definePlugin } from 'drydock'
import { usagePage } from './view/page'

export default definePlugin({
  name: 'usage-page',
  description: 'Usage page in settings: plan limits, tokens and API cost by model, day and thread',
  inject: ['wire'],
  uses: {
    settings: 'no Usage page; /usage shows the server report',
    commands: 'no /usage shortcut to the page',
    limits: 'limits only update when the page reloads',
    threads: 'thread rows do not open the thread',
  },
  apply(ctx) {
    const limits = pulse(ctx, ['limits.change'], ['limits'])
    const fail = (error: unknown) => ctx.notify?.push(errorMessage(error), { level: 'error' })

    ctx.watch('settings', settings => {
      if (!settings) return
      const openThread = (id: string) => {
        settings.close()
        void ctx.threads?.select(id).catch(fail)
      }
      const render = () =>
        usagePage({
          wire: ctx.wire,
          limits: () => {
            limits.version.get()
            return ctx.limits?.current()
          },
          refreshLimits: () => (ctx.limits ? ctx.limits.refresh().catch(fail) : Promise.resolve()),
          openThread: ctx.threads ? openThread : undefined,
        })
      const page = settings.page({ id: 'usage', label: 'Usage', icon: 'chart', order: 60, render })
      const command = ctx.watch('commands', commands =>
        commands?.add({ name: 'usage', title: 'Usage', description: 'Plan limits, tokens and API cost', source: 'local', run: () => settings.open('usage') }),
      )
      const action = ctx.watch('nav', nav => nav?.action({ id: 'usage', label: 'Usage', icon: 'chart', place: 'footer', order: 110, run: () => settings.open('usage') }))
      return () => {
        void page()
        void command()
        void action()
      }
    })
  },
})
