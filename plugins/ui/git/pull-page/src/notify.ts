import { type Toast, toasts } from '@sand/toasts/contract'
import { errorMessage } from '@sand/util'
import type { PageContext } from './inject'

const toastId = 'git-pull-page'

export const notify = (ctx: PageContext, toast: Toast) => ctx.get(toasts)?.show({ id: toastId, ...toast })

export const notifyError = (ctx: PageContext, title: string, error: unknown) => {
  const shown = ctx.get(toasts)
  if (!shown) return ctx.report(error)
  shown.show({ id: toastId, tone: 'danger', sticky: true, title, detail: errorMessage(error) })
}

export const attempt = async <T>(ctx: PageContext, title: string, work: () => Promise<T>): Promise<T | undefined> => {
  try {
    return await work()
  } catch (error) {
    notifyError(ctx, title, error)
    return undefined
  }
}
