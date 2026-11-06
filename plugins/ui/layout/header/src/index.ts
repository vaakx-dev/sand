import { pcs, pcsChange } from '@sand/devices-contract'
import { layout, layoutChange, place } from '@sand/layout/contract'
import { threadsSlot } from '@sand/threads-space/contract'
import { kit } from '@sand/ui-kit/contract'
import { projects, projectsChange, threadSelect, threads, threadsChange } from '@sand/web-client/contract'
import { owned, pulse } from '@sand/reactive'
import { definePlugin } from 'drydock'
import { header } from './contract'
import { createSlots } from './slots'
import { headerView } from './view'

export default definePlugin({
  name: 'header',
  description: 'Breadcrumb bar: project / thread title with a thread menu, slots for other controls and a button for the side drawer',
  inject: { kit },
  apply(ctx) {
    const changes = pulse(ctx, [threadsChange, threadSelect, layoutChange, pcsChange, projectsChange], [threads, layout, pcs, projects])
    const slots = owned(ctx, createSlots)
    const view = owned(ctx, () => headerView(ctx, changes, slots))
    place(ctx, threadsSlot('main'), view, 0)
    ctx.provide(header, { slot: (view, order, side) => slots.add(view, order, side) })
  },
})
