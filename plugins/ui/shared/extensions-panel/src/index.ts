import { pulse } from '@sand/dom'
import { definePlugin } from 'drydock'
import { interfacePage } from './page'

export default definePlugin({
  name: 'extensions-panel',
  description: 'Interface settings page: chat style, sidebar and composer choices, parts to turn on or off, and every extension with its roles for plugin authors',
  inject: ['extensions', 'settings'],
  uses: { commands: 'no /extensions command', notify: 'copying an id shows no message' },
  apply(ctx) {
    const changes = pulse(ctx)
    ctx.on('extensions.change', changes.schedule)
    ctx.on('drydock.status', changes.schedule)
    ctx.effect(() => ctx.settings.page({ id: 'interface', label: 'Interface', icon: 'layers', order: 10, render: () => interfacePage(ctx, changes) }))
    ctx.watch('commands', commands =>
      commands?.add({ name: 'extensions', description: 'Change the interface: chat style, sidebar and parts', run: () => ctx.settings.open('interface') }),
    )
  },
})
