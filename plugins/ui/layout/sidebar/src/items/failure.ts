import { picker } from '@sand/picker/contract'
import { errorMessage } from '@sand/util'
import type { Context } from 'drydock'

export const attempt = (ctx: Context, title: string, work: () => Promise<unknown> | void) =>
  Promise.resolve()
    .then(work)
    .catch(error => {
      const ask = ctx.get(picker)
      if (!ask) return console.error(error)
      void ask.choose(title, [{ label: errorMessage(error), tone: 'error', value: true }])
    })
