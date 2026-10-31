import { composer, type Composer } from '@sand/composer/contract'
import { wire } from '@sand/devices-contract'
import { gitStatusClient } from '@sand/git/contract'
import { markdown } from '@sand/markdown/contract'
import { panels } from '@sand/panel/contract'
import { kit } from '@sand/ui-kit/contract'
import { threadChange, threads, threadSelect, threadsChange } from '@sand/web-client/contract'
import { div, dynamicChild, mount, sig } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { filesPanel } from './contract'
import { filePage } from './file/page'
import { listPage } from './list'
import { filesModel } from './model'

const panelId = 'files'

export default definePlugin({
  name: 'files-panel',
  description: "Files tab in the right panel: browse the current thread's folder, see what changed and read its files",
  inject: { kit, threads, wire },
  apply(ctx) {
    const model = filesModel(ctx.wire, ctx.threads)
    const writer = sig<Composer | undefined>(undefined)
    ctx.watch(composer, found => writer.set(found))
    ctx.watch(gitStatusClient, found => model.useGit(found))

    let running = false
    const follow = () => {
      model.follow()
      const now = ctx.threads.current()?.running ?? false
      if (running && !now) model.refresh()
      running = now
    }
    ctx.on(threadSelect, follow)
    ctx.on(threadsChange, follow)
    ctx.on(threadChange, follow)

    const parts = { kit: ctx.kit, model, markdown: () => ctx.get(markdown), writer }
    const view = () => div({ class: 'absolute inset-0' }, listPage(ctx.kit, model), dynamicChild(model.opened, path => (path ? filePage(parts, path) : null)))
    ctx.provide(filesPanel, {
      open(path) {
        model.opened.set(path)
        ctx.get(panels)?.show(panelId)
      },
    })

    ctx.watch(panels, host => {
      if (!host) return
      const handle = host.panel({
        id: panelId,
        title: 'Files',
        icon: 'folder',
        order: 30,
        render: body => {
          model.start()
          return mount(body, view())
        },
      })
      return () => handle.dispose()
    })
  },
})
