import { dynamicChild } from '@vaakx-dev/vrui'
import type { ComposerContext } from '../context'
import type { Model } from '../model'
import { errorBanner } from './banner'
import { turnErrorBanner } from './turn'

const failureBanner = (ctx: ComposerContext, model: Model) =>
  dynamicChild(model.failure, failure =>
    failure
      ? errorBanner(ctx.kit, {
          text: failure.text,
          ...(failure.retry && { retry: () => void model.send() }),
          dismiss: () => model.failure.set(undefined),
        })
      : null,
  )

export const errorBanners = (ctx: ComposerContext, model: Model) => [failureBanner(ctx, model), turnErrorBanner(ctx, model)]
