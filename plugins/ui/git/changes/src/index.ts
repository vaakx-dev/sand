import { composer } from '@sand/composer/contract'
import { filesPanel } from '@sand/files-panel/contract'
import { keys } from '@sand/keys/contract'
import { panels } from '@sand/panel/contract'
import { effect, mount, sig, type Sig } from '@vaakx-dev/vrui'
import { definePlugin, type Service } from 'drydock'
import { changesPanel } from './contract'
import { inject } from './inject'
import { changesModel } from './model/model'
import { scopeSources } from './scope/sources'
import { changesPage } from './view/page'

export default definePlugin({
  name: 'git-changes',
  description: "Changes tab in the right panel: the thread's git diff by file, in unified or split view, with lines you can quote into the reply",
  inject,
  apply(ctx) {
    const sources = scopeSources()
    const model = changesModel(ctx, sources)
    const openPanel = () => ctx.get(panels)?.show('changes')
    const followed = <T>(role: Service<T>): Sig<T | undefined> => {
      const found = sig<T | undefined>(undefined)
      ctx.watch(role, next => found.set(next))
      return found
    }
    const services = { writer: followed(composer), files: followed(filesPanel), diff: ctx.diff }
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

    ctx.provide(changesPanel, {
      scopes: { register: sources.register },
      show(scope) {
        if (scope) model.pick(scope)
        openPanel()
      },
    })
    ctx.watch(keys, found => found?.bind({ key: 'mod+d', global: true, run: openPanel }))
  },
})
