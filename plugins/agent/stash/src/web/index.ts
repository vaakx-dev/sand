import type {} from '@sand/composer-card/contract'
import type {} from '@sand/ui-kit/contract'
import type {} from '@sand/web-client/contract'
import { joinDisposers } from '@sand/kit'
import { owned } from '@sand/kit/web'
import { effect, untrack } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { createActions } from './actions'
import { createItems } from './items'
import { createTab } from './tab/tab'

export default definePlugin({
  name: 'stash-web',
  description: 'Ctrl+S or a long-press on send saves the composer for later; a small tab on top of the composer lists saved prompts to put back',
  inject: ['composer', 'threads', 'wire', 'kit'],
  uses: {
    keys: 'no Ctrl+S or Ctrl+Shift+S; use the tab or a long-press on send',
    notify: 'no Undo after stashing and no warnings when putting back',
  },
  apply(ctx) {
    const items = createItems(ctx)
    const actions = createActions(ctx, items)
    const tab = owned(ctx, () => createTab(ctx, items, actions))

    ctx.effect(() =>
      effect(() => {
        if (!items.list.get().length) return
        const remove = untrack(() => ctx.composer.slot('tab', tab.view))
        return () => void remove()
      }),
    )
    ctx.effect(() => ctx.composer.sendMenu({ id: 'stash', label: 'Stash for later', icon: 'stash', group: 'stash', tile: true, run: () => void actions.stash() }))
    ctx.watch('keys', keys =>
      keys
        ? joinDisposers(
            keys.bind({ key: 'mod+s', global: true, run: () => void actions.stash().then(saved => saved || tab.open()) }),
            keys.bind({ key: 'mod+shift+s', global: true, run: tab.toggle }),
          )
        : undefined,
    )
  },
})
