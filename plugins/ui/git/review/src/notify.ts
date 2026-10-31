import { type Toast, toasts } from '@sand/toasts/contract'
import { errorMessage } from '@sand/util'
import type { ReviewContext } from './inject'

const toastId = 'git-review'

export const notify = (ctx: ReviewContext, toast: Toast) => ctx.get(toasts)?.show({ id: toastId, ...toast })

export const notifyError = (ctx: ReviewContext, title: string, error: unknown) => {
  const shown = ctx.get(toasts)
  if (!shown) return ctx.report(error)
  shown.show({ id: toastId, tone: 'danger', sticky: true, title, detail: errorMessage(error) })
}

export const attempt = async <T>(ctx: ReviewContext, title: string, work: () => Promise<T>): Promise<T | undefined> => {
  try {
    return await work()
  } catch (error) {
    notifyError(ctx, title, error)
    return undefined
  }
}
