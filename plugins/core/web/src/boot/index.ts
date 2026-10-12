import { errorMessage } from '@sand/kit'
import { div, mount } from '@vaakx-dev/vrui'
import { createApp, inspector } from 'drydock'
import { build, extensions, problems } from 'sand:extensions'
import { provideExtensions } from './extensions'
import { reloadOnNewBuild } from './reload'
import { paintPage } from './theme'
import { registerWorker } from './worker'

mount(document.body, div({ id: 'stage', class: 'fixed inset-0 flex flex-col overflow-auto' }))
registerWorker()
const ctx = createApp()
ctx.on('drydock.error', (scope, error) => {
  console.error(`[${scope.name}]`, error)
  ctx.notify?.push(`${scope.name}: ${errorMessage(error)}`, { level: 'error' })
})
ctx.plugin(inspector)
paintPage(ctx)
reloadOnNewBuild(ctx, build)
provideExtensions(ctx, build, extensions)
for (const problem of problems) console.error(problem)
Object.assign(window, { sand: ctx })
