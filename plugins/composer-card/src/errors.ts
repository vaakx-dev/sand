import { derive, div, icon, iconButton, secondaryAction, show, span } from '@sand/dom'
import { bannerPanel } from './components/glass'
import type { Model } from './model'

const banner = (text: () => string, retry: (() => boolean) | undefined, onRetry: () => void, dismiss: () => void) =>
  bannerPanel(
    'danger',
    div(
      { class: 'flex min-h-6 items-center gap-2' },
      span({ class: 'inline-flex shrink-0' }, icon('alert', 13)),
      span({ class: 'min-w-0 flex-1' }, text),
      show(derive(() => retry?.() ?? true), () => secondaryAction({ size: 'sm', onClick: onRetry }, icon('retry', 13), 'Retry')),
      iconButton({ size: 'sm', title: 'Dismiss', onClick: dismiss }, icon('x', 13)),
    ),
  )

export const errorBanners = (model: Model) => [
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
  show(
    derive(() => Boolean(model.turnError.get()) && !model.failure.get()),
    () =>
      banner(
        () => `The last turn stopped: ${model.turnError.get()?.text}`,
        undefined,
        model.retryTurn,
        () => model.dismiss(model.turnError.get()!.key),
      ),
  ),
]
