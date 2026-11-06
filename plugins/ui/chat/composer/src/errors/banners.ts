import { dynamicChild } from '@vaakx-dev/vrui'
import type { ComposerContext } from '../context'
import type { Model } from '../model'
import { errorBanner } from './banner'

export const failureBanner = (ctx: ComposerContext, model: Model) =>
  dynamicChild(model.failure, failure => {
    if (!failure) return null
    const { text, retry } = failure
    return errorBanner(ctx.kit, {
      text,
      ...(retry && { retry: () => void model.resend(retry) }),
      dismiss: () => model.failure.set(undefined),
    })
  })
