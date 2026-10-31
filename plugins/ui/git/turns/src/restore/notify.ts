import { type Toast, toasts } from '@sand/toasts/contract'
import { errorMessage } from '@sand/util'
import type { TurnsContext } from '../inject'

const toastId = (session: string) => `git-turns:${session}`

export const notify = (ctx: TurnsContext, session: string, toast: Toast) => ctx.get(toasts)?.show({ id: toastId(session), ...toast })

export const notifyError = (ctx: TurnsContext, session: string, title: string, error: unknown) => {
  const shown = ctx.get(toasts)
  if (!shown) return ctx.report(error)
  shown.show({ id: toastId(session), tone: 'danger', sticky: true, title, detail: errorMessage(error) })
}
