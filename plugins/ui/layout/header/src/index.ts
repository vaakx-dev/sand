import { layout, layoutChange } from '@sand/layout/contract'
import { place } from '@sand/layout/place'
import { kit } from '@sand/ui-kit/contract'
import { projects, projectsChange, threadSelect, threads, threadsChange, wire, wireState } from '@sand/web-client/contract'
import { owned, pulse } from '@sand/web-client/reactive'
import { definePlugin } from 'drydock'
import { header } from './contract'
import { createSlots } from './slots'
import { headerView } from './view'

export default definePlugin({
  name: 'header',
  description: 'Breadcrumb bar: project / thread title with a thread menu, slots for other controls and a button for the side drawer',
  inject: { kit },
  apply(ctx) {
    const changes = pulse(ctx, [threadsChange, threadSelect, layoutChange, wireState, projectsChange], [threads, layout, wire, projects])
    const slots = owned(ctx, createSlots)
    const view = owned(ctx, () => headerView(ctx, changes, slots))
    place(ctx, 'main', view, 0)
    ctx.provide(header, { slot: (view, order, side) => slots.add(view, order, side) })
  },
})
