import { modelPill } from '@sand/model-panel/contract'
import { models } from '@sand/web-client/contract'
import { derive, div, dynamicChild } from '@vaakx-dev/vrui'
import type { ComposerContext } from '../context'
import type { Model, TurnError } from '../model'
import { errorBanner } from './banner'

const hints: [string, (pc: string) => string][] = [
  [' is offline', pc => `The account for this model is on ${pc}. Turn ${pc} on or wake it up, then try again.`],
  [' no longer accepts', pc => `Pair ${pc} with this PC again from Devices, then try again.`],
  [" doesn't share", pc => `Turn sharing back on for this account on ${pc}, then try again.`],
]

const pcHint = ({ via, text }: TurnError) => {
  const found = via && hints.find(([words]) => text.startsWith(`${via}${words}`))
  return found ? found[1](via) : undefined
}

const banner = (ctx: ComposerContext, model: Model, error: TurnError) => {
  const { secondaryAction } = ctx.kit
  const hint = pcHint(error)
  const pill = ctx.get(modelPill)
  const pick = hint && pill && ctx.get(models)?.list().some(model => !model.via)
  return errorBanner(ctx.kit, {
    text: error.text,
    ...(hint && { hint }),
    retry: model.retryTurn,
    actions: pick ? [secondaryAction({ size: 'sm', onClick: () => pill.open() }, 'Use a model on this PC')] : [],
    ...(error.detail && { detail: error.detail }),
    dismiss: () => model.dismiss(error.key),
  })
}

export const turnErrorBanner = (ctx: ComposerContext, model: Model) =>
  div(
    { class: 'relative flex flex-col', hidden: () => Boolean(model.failure.get()) },
    dynamicChild(
      derive(() => model.turnError.get()?.key ?? ''),
      key => {
        const error = model.turnError.get()
        return key && error ? banner(ctx, model, error) : null
      },
    ),
  )
