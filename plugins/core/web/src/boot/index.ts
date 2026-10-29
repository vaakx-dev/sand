import { div, mount } from '@vaakx-dev/vrui'
import { createApp, inspectorPlugin, scopeError } from 'drydock'
import { build, extensions, problems } from 'sand:extensions'
import { mountExtensions } from './extensions'
import { reloadOnNewBuild } from './reload'
import { paintPage } from './theme'
import { registerWorker } from './worker'

mount(document.documentElement, { class: 'overscroll-none' })
mount(document.body, { class: 'overscroll-none' }, div({ id: 'stage', class: 'fixed inset-0 flex flex-col overflow-auto overscroll-contain' }))
registerWorker()
const ctx = createApp()
ctx.on(scopeError, (scope, error) => console.error(`[${scope.name}]`, error))
ctx.plugin(inspectorPlugin)
paintPage(ctx)
reloadOnNewBuild(ctx, build)
mountExtensions(ctx, extensions)
for (const problem of problems) console.error(problem)
Object.assign(window, { sand: ctx })
