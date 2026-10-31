import { composer } from '@sand/composer/contract'
import { filesPanel } from '@sand/files-panel/contract'
import { keys } from '@sand/keys/contract'
import { markdown } from '@sand/markdown/contract'
import { panels } from '@sand/panel/contract'
import { effect, mount, sig, type Sig } from '@vaakx-dev/vrui'
import { definePlugin, type Service } from 'drydock'
import { inject } from './inject'
import { changesModel } from './model/model'
import { changesPage } from './view/page'

export default definePlugin({
  name: 'git-changes',
  description: "Changes tab in the right panel: the thread's git diff by file, in unified or split view, with lines you can quote into the reply",
  inject,
  apply(ctx) {
    const model = changesModel(ctx)
    const followed = <T>(role: Service<T>): Sig<T | undefined> => {
      const found = sig<T | undefined>(undefined)
      ctx.watch(role, next => found.set(next))
      return found
    }
    const services = { writer: followed(composer), files: followed(filesPanel), markdown: followed(markdown) }
    const look = () => ({ badge: model.badge.get(), hidden: !model.visible.get() })

    ctx.watch(panels, host => {
      if (!host) return
      const handle = host.panel({
        id: 'changes',
        title: 'Changes',
        icon: 'branch',
        order: 25,
        ...look(),
        render: body => mount(body, changesPage(ctx.kit, model, services)),
      })
      const stop = effect(() => handle.update(look()))
      return () => {
        stop()
        handle.dispose()
      }
    })

    ctx.watch(keys, found => found?.bind({ key: 'mod+d', global: true, run: () => ctx.get(panels)?.show('changes') }))
  },
})
