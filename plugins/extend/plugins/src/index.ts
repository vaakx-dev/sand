import { settings } from '@sand/settings/contract'
import { definePlugin } from 'drydock'
import { inject } from './context'
import { versionsSource } from './history/source'
import { historyToggle } from './history/versions'
import { failuresSource } from './library/failures'
import type { RowActions } from './library/row'
import { librarySource } from './library/source'
import { pluginsPage } from './page'
import { page } from './shown'
import { syncSource } from './sync/source'

export default definePlugin({
  name: 'plugins',
  description: 'Plugins settings page: every built-in and user plugin, load errors, customised copies, past versions and plugin changes from your other PCs',
  inject,
  apply(ctx) {
    const sync = syncSource(ctx)
    const library = librarySource(ctx)
    const versions = versionsSource(ctx)
    const failures = failuresSource(ctx)
    const actions: RowActions = {
      busy: () => library.busy.get() !== undefined,
      failure: failures.failure,
      history: (key, open) => historyToggle(ctx.kit, versions, key, open),
      hasHistory: key => versions.targets.get().some(item => item.key === key && item.versions.length > 0),
      copy: versions.copy,
      customise: plugin => void library.customise(plugin.name),
      restore: plugin => void library.restore(plugin.name),
      keep: plugin => library.keep(plugin.name),
    }
    ctx.watch(settings, found =>
      found?.page({ id: page, label: 'Plugins', icon: 'puzzle', order: 45, render: () => pluginsPage(ctx.kit, { sync, library, versions, actions }) }),
    )
  },
})
