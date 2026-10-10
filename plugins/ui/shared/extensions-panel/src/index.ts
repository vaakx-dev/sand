import { pulse } from '@sand/dom'
import { definePlugin } from 'drydock'
import { interfacePage, partsSection } from './page'

export default definePlugin({
  name: 'extensions-panel',
  description: 'Interface settings page for chat style, sidebar and composer choices, plus interface parts to turn on or off and every extension with its roles on the Plugins page',
  inject: ['extensions', 'settings'],
  uses: { commands: 'no /extensions command', notify: 'copying an id shows no message' },
  apply(ctx) {
    const changes = pulse(ctx)
    ctx.on('extensions.change', changes.schedule)
    ctx.on('drydock.status', changes.schedule)
    ctx.effect(() => ctx.settings.page({ id: 'interface', label: 'Interface', icon: 'layers', order: 10, render: () => interfacePage(ctx, changes) }))
    ctx.effect(() => ctx.settings.section({ page: 'plugins', id: 'interface-parts', order: -1, render: () => partsSection(ctx, changes) }))
    ctx.watch('commands', commands =>
      commands?.add({ name: 'extensions', description: 'Change the interface: chat style, sidebar and composer', run: () => ctx.settings.open('interface') }),
    )
  },
})
