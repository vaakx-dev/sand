import { type Toast, toasts } from '@sand/toasts/contract'
import { errorMessage } from '@sand/util'
import type { PullsContext } from './inject'

const toastId = 'git-pulls'

export const notify = (ctx: PullsContext, toast: Toast) => ctx.get(toasts)?.show({ id: toastId, ...toast })

export const notifyError = (ctx: PullsContext, title: string, error: unknown) => {
  const shown = ctx.get(toasts)
  if (!shown) return ctx.report(error)
  shown.show({ id: toastId, tone: 'danger', sticky: true, title, detail: typeof error === 'string' ? error : errorMessage(error) })
}

export const githubAction = (ctx: PullsContext, url: string) => ({ label: 'Open on GitHub', run: () => ctx.kit.openTab(url) })
