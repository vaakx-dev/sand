import { div, icon, iconButton, secondaryAction, show, span } from '@sand/dom'
import type { Context } from 'drydock'
import { bannerPanel } from '../dock/glass'
import type { Model } from '../model'
import { turnErrorBanner } from './turn'

const failureBanner = (model: Model) =>
  bannerPanel(
    'danger',
    div(
      { class: 'flex min-h-6 items-center gap-2' },
      span({ class: 'inline-flex shrink-0' }, icon('alert', 13)),
      span({ class: 'min-w-0 flex-1' }, () => model.failure.get()?.text ?? ''),
      show(
        () => Boolean(model.failure.get()?.retry),
        () => secondaryAction({ size: 'sm', onClick: () => void model.send() }, icon('retry', 13), 'Retry'),
      ),
      iconButton({ size: 'sm', title: 'Dismiss', onClick: () => model.failure.set(undefined) }, icon('x', 13)),
    ),
  )

export const errorBanners = (ctx: Context, model: Model) => [
  show(
    () => Boolean(model.failure.get()),
    () => failureBanner(model),
  ),
  turnErrorBanner(ctx, model),
]
