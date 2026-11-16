import { drainOrder, llm, planSiblings } from '@sand/accounts/contract'
import { definePlugin } from 'drydock'
import { accountPool } from './contract'

export default definePlugin({
  name: 'account-pool',
  description: 'Starts each new chat on the plan account, among those offering its model, whose usage resets soonest, leaving accounts close to their limit for last and skipping ones out of usage',
  apply(ctx) {
    ctx.provide(accountPool, {
      start(model) {
        const models = ctx.get(llm)
        const asked = models?.find?.(model)
        const siblings = models && asked ? planSiblings(models, asked) : []
        if (!models || !siblings.some(found => found.id === asked?.id)) return model
        return drainOrder(models, siblings)[0]?.id ?? model
      },
    })
  },
})
