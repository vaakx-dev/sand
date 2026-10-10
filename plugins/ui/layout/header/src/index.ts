import { owned, place, pulse } from '@sand/dom'
import { definePlugin } from 'drydock'
import { createSlots } from './slots'
import { headerView } from './view'

export default definePlugin({
  name: 'header',
  description: 'Breadcrumb bar: project / title with a thread menu, slots for other controls, and buttons for the side drawer and the right panel',
  uses: {
    threads: 'shows just "sand"',
    layout: 'no drawer or panel buttons',
    commands: 'the thread menu only renames and copies the link',
    picker: 'no rename',
    jobs: 'no working dot on the panel button',
    projects: 'the project name and icon come from the folder alone',
    worktrees: 'a thread in a worktree shows the worktree folder as its project',
  },
  apply(ctx) {
    const changes = pulse(
      ctx,
      ['threads.change', 'thread.select', 'layout.change', 'wire.state', 'projects.change', 'jobs.change', 'worktrees.change'],
      ['threads', 'layout', 'wire', 'projects', 'jobs', 'worktrees'],
    )
    const slots = owned(ctx, createSlots)
    const view = owned(ctx, () => headerView(ctx, changes, slots))
    place(ctx, 'main', view, 0)
    ctx.provide('header', { slot: (view, order) => slots.add(view, order) })
  },
})
