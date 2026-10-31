import { floating } from '@sand/layout/place'
import { kit } from '@sand/ui-kit/contract'
import { definePlugin } from 'drydock'
import { toasts } from './contract'
import { toastModel } from './model'
import { watchNarrow } from './narrow'
import { toastStack } from './stack'

export default definePlugin({
  name: 'toasts',
  description: 'Short floating messages about what just happened, what failed and what you can do next',
  inject: { kit },
  apply(ctx) {
    const model = toastModel()
    const narrow = watchNarrow(ctx)
    floating(ctx, () => toastStack(ctx.kit, model, narrow))
    ctx.provide(toasts, { show: model.show })
  },
})
