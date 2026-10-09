import { derive, div, icon, iconButton, secondaryAction, show, span } from '@sand/dom'
import type { Context } from 'drydock'
import { bannerPanel } from './components/glass'
import type { Model } from './model'
import { turnErrorBanner } from './turn-error'

const banner = (text: () => string, retry: () => boolean, onRetry: () => void, dismiss: () => void) =>
  bannerPanel(
    'danger',
    div(
      { class: 'flex min-h-6 items-center gap-2' },
      span({ class: 'inline-flex shrink-0' }, icon('alert', 13)),
      span({ class: 'min-w-0 flex-1' }, text),
      show(derive(retry), () => secondaryAction({ size: 'sm', onClick: onRetry }, icon('retry', 13), 'Retry')),
      iconButton({ size: 'sm', title: 'Dismiss', onClick: dismiss }, icon('x', 13)),
    ),
  )

export const errorBanners = (ctx: Context, model: Model) => [
  show(
    derive(() => Boolean(model.failure.get())),
    () =>
      banner(
        () => model.failure.get()?.text ?? '',
        () => Boolean(model.failure.get()?.retry),
        () => void model.send(),
        () => model.failure.set(undefined),
      ),
  ),
  turnErrorBanner(ctx, model),
]
