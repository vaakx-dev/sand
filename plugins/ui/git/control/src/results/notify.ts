import type { GitActionFailure } from '@sand/git-actions/contract'
import type { GitPlace } from '@sand/git/contract'
import { type ToastAction, toasts } from '@sand/toasts/contract'
import type { ControlContext } from '../inject'
import { placeKey } from '../status/place'

export interface FailureNote {
  detail?: string
  actions: ToastAction[]
}

const toastId = (place: GitPlace) => `git-control:${placeKey(place)}`

export const notifySuccess = (ctx: ControlContext, place: GitPlace, title: string, detail?: string) => {
  ctx.get(toasts)?.show({ id: toastId(place), tone: 'success', title, detail })
}

export const notifyFailure = (ctx: ControlContext, place: GitPlace, failure: GitActionFailure, note: FailureNote) => {
  const shown = ctx.get(toasts)
  if (!shown) {
    ctx.report(new Error(failure.message))
    return
  }
  shown.show({ id: toastId(place), tone: 'danger', sticky: true, title: failure.message, detail: note.detail, output: failure.output, actions: note.actions })
}
