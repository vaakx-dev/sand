import { definePlugin } from 'drydock'
import { reloadFinished } from './finished'

export default definePlugin({
  name: 'reload-button',
  description: 'Sidebar footer button that reloads every plugin from disk and spins until the reload finishes',
  inject: ['commands'],
  uses: { nav: 'no button; /reload still works', notify: 'reload errors go to the console' },
  apply(ctx) {
    const fail = (error: unknown) => (ctx.notify ? ctx.notify.push(String(error), { level: 'error' }) : console.error(error))
    const reload = async () => {
      const finished = reloadFinished(ctx)
      try {
        await ctx.commands.run('reload')
        await finished
      } catch (error) {
        fail(error)
      }
    }
    ctx.watch('nav', nav => nav?.action({ id: 'reload', label: 'Reload plugins', icon: 'reload', place: 'footer', end: true, order: 200, run: reload }))
  },
})
