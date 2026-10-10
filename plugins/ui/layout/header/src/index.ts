import { owned, place, pulse } from '@sand/dom'
import { definePlugin } from 'drydock'
import { createSlots } from './slots'
import { headerView } from './view'

export default definePlugin({
  name: 'header',
  description: 'Breadcrumb bar: project / title with a thread menu, git branch, slots for other controls, and buttons for the side drawer and the right panel',
  uses: {
    threads: 'shows just "sand"',
    layout: 'no drawer or panel buttons',
    branches: 'no branch name unless another extension fills the header',
    commands: 'the thread menu only renames and copies the link',
    picker: 'no rename',
    jobs: 'no working dot on the panel button',
    machines: 'a thread on another PC says "Other PC" instead of its name',
    projects: 'the project name and icon come from the folder alone',
  },
  apply(ctx) {
    const changes = pulse(
      ctx,
      ['threads.change', 'thread.select', 'layout.change', 'wire.state', 'machines.change', 'projects.change', 'jobs.change', 'branches.change'],
      ['threads', 'layout', 'wire', 'machines', 'projects', 'jobs', 'branches'],
    )
    const branchOf = (cwd: string | undefined) => ctx.branches?.of(cwd ?? '', ctx.threads?.device())
    const slots = owned(ctx, createSlots)
    const view = owned(ctx, () => headerView(ctx, changes, branchOf, slots))
    place(ctx, 'main', view, 0)
    ctx.provide('header', { slot: (view, order) => slots.add(view, order) })
  },
})
