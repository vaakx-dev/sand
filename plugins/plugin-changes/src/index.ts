import { definePlugin } from 'drydock'
import { offerNotice } from './notice'
import { pluginsPage } from './page'
import { pluginSource } from './source'

export default definePlugin({
  name: 'plugin-changes',
  description: 'Shows plugin changes from your other PCs and which plugins stay on this PC',
  inject: ['wire'],
  uses: {
    settings: 'no Plugins settings page',
    notify: 'no message when another PC changes a plugin',
  },
  apply(ctx) {
    const source = pluginSource(ctx)
    offerNotice(ctx, source)
    ctx.watch('settings', settings =>
      settings?.page({ id: 'plugins', label: 'Plugins', icon: 'puzzle', order: 45, render: () => pluginsPage(source) }),
    )
  },
})
