import { asPanel, collectScope, disposeAll, watchShown, type Shown } from '@sand/dom'
import { definePlugin } from 'drydock'
import { treeSource } from './source'
import { createTreeView, type TreeView } from './view'

export default definePlugin({
  name: 'panel-tree',
  description: 'Thread tree (/tree): jump to any point, fork from it, and label entries',
  inject: ['threads', 'wire'],
  uses: { panels: 'draws its own plain panel', commands: 'no /tree command', composer: 'prompts are not put back for editing', notify: 'silent' },
  apply(ctx) {
    const source = treeSource(ctx)
    const views = new Set<TreeView>()
    const shown = new Set<Shown>()
    const complete = () => {
      const thread = ctx.threads.current()
      if (thread?.loaded && !thread.complete && [...shown].some(watch => watch.get())) void ctx.threads.full(thread.id)
    }
    const sync = () => {
      complete()
      for (const view of views) view.sync()
    }

    asPanel(ctx, {
      id: 'tree',
      title: 'Tree',
      icon: 'tree',
      order: 30,
      render(body) {
        const { value: view, scope } = collectScope(() => createTreeView(source))
        body.append(view.root)
        views.add(view)
        const watch = watchShown(body, complete)
        shown.add(watch)
        return () => {
          watch.stop()
          shown.delete(watch)
          views.delete(view)
          view.root.remove()
          disposeAll(scope)
        }
      },
    })

    ctx.on('thread.select', sync)
    ctx.on('thread.change', id => {
      if (id === ctx.threads.current()?.id) sync()
    })
    ctx.watch('commands', commands =>
      commands?.add({
        name: 'tree',
        description: 'Browse the thread tree and jump to or fork from any point',
        run() {
          ctx.panels?.show('tree')
          for (const view of views) view.focus()
        },
      }),
    )
  },
})
