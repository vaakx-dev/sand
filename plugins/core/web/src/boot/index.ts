import { div, errorMessage, mount, sandTheme } from '@sand/dom'
import { createApp, inspector } from 'drydock'
import { build, extensions, problems } from 'sand:extensions'
import { provideExtensions } from './extensions'
import { reloadOnNewBuild } from './reload'
import { registerWorker } from './worker'

mount(
  document.body,
  {
    theme: sandTheme,
    mode: 'dark',
    class: 'bg-neutral-900 font-sans text-sm text-neutral-100 antialiased scrollbars-thin selection:bg-accent-500/40',
  },
  div({ id: 'stage', class: 'fixed inset-0 flex flex-col overflow-auto' }),
)
registerWorker()
const ctx = createApp()
ctx.on('drydock.error', (scope, error) => {
  console.error(`[${scope.name}]`, error)
  ctx.notify?.push(`${scope.name}: ${errorMessage(error)}`, { level: 'error' })
})
ctx.plugin(inspector)
reloadOnNewBuild(ctx, build)
provideExtensions(ctx, build, extensions)
for (const problem of problems) console.error(problem)
Object.assign(window, { sand: ctx })
