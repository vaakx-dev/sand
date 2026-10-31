import { type Toast, toasts } from '@sand/toasts/contract'
import { errorMessage } from '@sand/util'
import type { WorkspaceContext } from './inject'

const toastId = 'git-workspace'

export const notify = (ctx: WorkspaceContext, toast: Toast) => {
  ctx.get(toasts)?.show({ id: toastId, ...toast })
}

export const notifyError = (ctx: WorkspaceContext, title: string, error: unknown) => {
  const shown = ctx.get(toasts)
  if (!shown) return ctx.report(error)
  shown.show({ id: toastId, tone: 'danger', sticky: true, title, detail: typeof error === 'string' ? error : errorMessage(error) })
}
