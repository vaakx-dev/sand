import { place } from '@sand/layout/place'
import { kit } from '@sand/ui-kit/contract'
import { definePlugin } from 'drydock'
import { toasts } from './contract'
import { failureToasts } from './failures'
import { toastModel } from './model'
import { toastStack } from './stack'

export default definePlugin({
  name: 'toasts',
  description: 'Short floating messages about what just happened, what failed and what you can do next',
  inject: { kit },
  apply(ctx) {
    const model = toastModel()
    place(ctx, 'overlay', () => toastStack(ctx.kit, model), 300)
    ctx.provide(toasts, { show: model.show, ...failureToasts(model.show) })
  },
})
