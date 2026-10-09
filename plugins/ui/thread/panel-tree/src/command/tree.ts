import type { Command } from '@sand/server/contract'
import type { Session } from '@sand/sessions-sqlite/contract'
import { toolAction } from '../tree/action'
import { nodesOf } from '../tree/forest'
import { treeFrame } from '../tree/frame'
import { busyNote } from '../tree/moves'
import { fork, jump, label, type TreeContext } from './act'
import { treeItems } from './items'
import { fresh, nextFilter, options, title, type TreeView } from './view'

const frameOf = (session: Session, view: TreeView) => {
  const nodes = nodesOf(session.entries(), toolAction)
  return treeFrame(nodes, session.head, { selected: view.selected ?? session.head, filter: view.filter, search: '', folded: new Set() })
}

export const treeCommand = (ctx: TreeContext): Command => ({
  name: 'tree',
  title: 'Thread tree',
  description: 'Browse the thread tree and jump to or fork from any point',
  async run() {
    const session = ctx.ui.session()
    if (!session?.head) return ctx.ui.notify('Nothing to browse yet')
    let view = fresh
    while (true) {
      const frame = frameOf(session, view)
      const picked = await ctx.ui.choose(title, treeItems(frame, session.head), options(view, Math.max(0, frame.index)))
      if (!picked) return
      view = { ...view, query: picked.query, selected: picked.value, hint: undefined }
      if (picked.action === 'filter') {
        view = { ...view, filter: nextFilter(view.filter) }
        continue
      }
      const node = picked.value ? frame.forest.nodes.get(picked.value) : undefined
      if (!node) return
      if (picked.action === 'label') {
        if (await label(ctx, session, node.entry, node.label?.text)) view = { ...view, hint: 'Label saved' }
        continue
      }
      if (ctx.loop?.active(session)) return ctx.ui.notify(busyNote, 'error')
      return picked.action === 'fork' ? fork(ctx, session, node.entry) : jump(ctx, session, node.entry)
    }
  },
})
