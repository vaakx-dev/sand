import { settings } from '@sand/settings/contract'
import { kit } from '@sand/ui-kit/contract'
import { owned } from '@sand/reactive'
import { byOrder } from '@sand/util'
import { effect, sig, untrack } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { connections, type Connection } from './contract'
import { connectionsPage } from './page'

export default definePlugin({
  name: 'connections',
  description: 'Connections page in settings: outside services and tools that plugins add, with their status and actions',
  inject: { kit },
  apply(ctx) {
    const entries = sig<Connection[]>([])
    const add = (connection: Connection) => {
      entries.update(list => [...list.filter(entry => entry.id !== connection.id), connection].sort((a, b) => byOrder(a, b) || a.name.localeCompare(b.name)))
      return () => entries.update(list => list.filter(entry => entry !== connection))
    }
    const shown = owned(ctx, () => entries.map(list => list.length > 0))
    ctx.provide(connections, { add })
    ctx.watch(
      settings,
      found =>
        found &&
        effect(() => {
          if (!shown.get()) return
          const remove = untrack(() =>
            found.page({ id: 'connections', label: 'Connections', icon: 'link', order: 28, render: () => connectionsPage(ctx.kit, entries) }),
          )
          return () => void remove()
        }),
    )
  },
})
