import { definePlugin } from 'drydock'
import { copyWithNotice } from './copy'
import { versionsSource } from './history/source'
import { historyToggle } from './history/versions'
import { askSand } from './library/ask'
import { librarySource } from './library/source'
import { offerNotice } from './notice'
import { pluginsPage } from './page'
import { page } from './shown'
import type { RowActions } from './page/catalog/warning'
import { pluginSource } from './source'

export default definePlugin({
  name: 'plugin-changes',
  description: 'Lists built-in and user plugins, lets you customise built-ins, and shows plugin changes from your other PCs',
  inject: ['wire'],
  uses: {
    settings: 'no Plugins settings page',
    notify: 'no message when another PC changes a plugin',
    threads: 'Ask sand cannot start a thread',
    composer: 'Ask sand sends its question straight away',
    turns: 'Ask sand cannot send its question',
    models: 'Ask sand uses the default model',
  },
  apply(ctx) {
    const source = pluginSource(ctx)
    const library = librarySource(ctx)
    const versions = versionsSource(ctx)
    offerNotice(ctx, source)
    const actions: RowActions = {
      busy: () => library.busy.get() !== undefined,
      history: (key, open) => historyToggle(versions, key, open),
      hasHistory: key => versions.targets.get().some(item => item.key === key && item.versions.length > 0),
      copy: (text, what) => copyWithNotice(ctx, text, what),
      customise: plugin => void library.customise(plugin.name),
      restore: plugin => void library.restore(plugin.name),
      keep: plugin => library.keep(plugin.name),
      ask: plugin => {
        const root = library.library.get()?.root
        if (root) askSand(ctx, root, plugin).catch(library.fail)
      },
    }
    ctx.watch('settings', settings =>
      settings?.page({ id: page, label: 'Plugins', icon: 'puzzle', order: 45, render: () => pluginsPage(source, library, versions, actions) }),
    )
  },
})
