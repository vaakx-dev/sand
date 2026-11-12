import { keys } from '@sand/keys/contract'
import { palette } from '@sand/palette/contract'
import { kit } from '@sand/ui-kit/contract'
import { shell } from '@sand/ui-shell/contract'
import { derive, div, dynamicChild } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { needs } from './contract'
import { createList } from './list'
import { needsScreen } from './screen'

const kind = 'needs'
const label = 'Needs you'

export default definePlugin({
  name: 'needs-you',
  description: "Everything waiting on you in one place, counted once in the sidebar: sign-ins and keys, work that couldn't merge and work ready to merge, each settled where it shows",
  inject: { kit, shell },
  apply(ctx) {
    const host = createList()
    const items = derive(() => host.list())

    host.open = () => ctx.shell.open({ kind })

    ctx.provide(needs, host)
    ctx.watch(keys, found => found?.bind({ key: 'mod+j', global: true, passthrough: true, run: () => host.open() }))
    ctx.watch(palette, found => found?.source({ id: 'needs', order: 5, items: () => [{ id: 'needs:open', group: 'Actions', icon: 'inbox', label, search: 'needs waiting sign-in key merge review', run: () => host.open() }] }))
    ctx.effect(() =>
      ctx.shell.nav({
        id: 'needs',
        label,
        icon: 'inbox',
        order: 10,
        look: 'alert',
        keys: 'mod+j',
        count: () => items.get().length,
        summary: () => {
          const count = items.get().length
          return `${count} ${count === 1 ? 'needs' : 'need'} you`
        },
        detail: () => {
          const first = items.get()[0]
          return first ? `${first.who}: ${first.title}` : ''
        },
        to: { kind },
      }),
    )
    ctx.effect(() =>
      ctx.shell.route({
        kind,
        render: () => {
          const phone = derive(() => ctx.shell.state() === 'phone')
          return {
            head: () => dynamicChild(phone, onPhone => (onPhone ? ctx.kit.barTitle(label) : null)),
            main: () => div({ class: 'flex min-h-0 min-w-0 flex-1 flex-col' }, needsScreen(ctx.kit, items)),
          }
        },
      }),
    )
  },
})
