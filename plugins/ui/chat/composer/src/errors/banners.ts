import type { Kit } from '@sand/ui-kit/contract'
import { div, show, span } from '@vaakx-dev/vrui'
import type { ComposerContext } from '../context'
import { bannerPanel } from '../dock/glass'
import type { Model } from '../model'
import { turnErrorBanner } from './turn'

const failureBanner = ({ closeButton, icon, secondaryAction }: Kit, model: Model) =>
  bannerPanel(
    'danger',
    div(
      { class: 'flex min-h-6 items-center gap-2' },
      span({ class: 'inline-flex shrink-0' }, icon('alert', 14)),
      span({ class: 'min-w-0 flex-1' }, () => model.failure.get()?.text ?? ''),
      show(
        () => Boolean(model.failure.get()?.retry),
        () => secondaryAction({ size: 'sm', onClick: () => void model.send() }, icon('retry', 14), 'Retry'),
      ),
      closeButton({ title: 'Dismiss', size: 'sm', onClick: () => model.failure.set(undefined) }),
    ),
  )

export const errorBanners = (ctx: ComposerContext, model: Model) => [
  show(
    () => Boolean(model.failure.get()),
    () => failureBanner(ctx.kit, model),
  ),
  turnErrorBanner(ctx, model),
]
