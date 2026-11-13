import { pcs, wire } from '@sand/devices-contract'
import { kit } from '@sand/ui-kit/contract'
import { usageViews } from '@sand/usage-page/contract'
import { definePlugin } from 'drydock'
import { createModel } from './model'
import { performancePage } from './view/page'

const ORDER = 10

export default definePlugin({
  name: 'performance-page',
  description: 'Performance beside Usage: memory and CPU on each of your PCs over time, the chats using them, and the memory guard switch for all PCs',
  inject: { usageViews, wire, pcs, kit },
  apply(ctx) {
    const model = createModel(ctx)
    ctx.effect(() => ctx.usageViews.add({ id: 'performance', label: 'Performance', order: ORDER, render: () => performancePage(ctx.kit, model) }))
  },
})
