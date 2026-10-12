import { shownPanel } from '@sand/kit/web'
import { scoped } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { treeSource } from './source'
import { createTreeView, type TreeView } from './view'

export default definePlugin({
  name: 'panel-tree',
  description: 'Thread tree (/tree): jump to any point, fork from it, and label entries',
  inject: ['threads', 'wire', 'kit'],
  uses: { panels: 'draws its own plain panel', commands: 'no /tree command', composer: 'prompts are not put back for editing', notify: 'silent' },
  apply(ctx) {
    const source = treeSource(ctx)
    const views = new Set<TreeView>()
    const complete = () => {
      const thread = ctx.threads.current()
      if (thread?.loaded && !thread.complete && panel.shown()) void ctx.threads.full(thread.id)
    }
    const sync = () => {
      complete()
      for (const view of views) view.sync()
    }
    const view = () => {
      const tree = createTreeView(ctx.kit, source)
      views.add(tree)
      scoped(() => views.delete(tree))
      return tree.root
    }

    const panel = shownPanel(ctx, { id: 'tree', title: 'Tree', icon: 'tree', order: 30 }, view, complete)

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
