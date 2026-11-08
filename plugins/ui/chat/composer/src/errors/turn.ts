import { modelButton } from '@sand/model-panel/contract'
import { pulse } from '@sand/reactive'
import { errorMessage } from '@sand/util'
import { models, modelsChange, threadChange, threadSelect } from '@sand/web-client/contract'
import { derive, div, dynamicChild, sig } from '@vaakx-dev/vrui'
import type { ComposerContext } from '../context'
import type { Model } from '../model'
import { retry } from '../send/submit'
import { errorBanner } from './banner'

const turnErrorOf = (ctx: ComposerContext, dismissed: Set<string>) => {
  const thread = ctx.threads.current()
  if (!thread || thread.turn || thread.ended?.stopReason !== 'error') return undefined
  const key = `${thread.id}:${thread.info.head}`
  if (dismissed.has(key)) return undefined
  const known = ctx.get(models)
  const info = known?.info(known.settings(thread.id)?.model)
  const source = info?.source ? known?.sources().find(found => found.id === info.source) : undefined
  return { key, text: thread.ended.error ?? 'Unknown error', detail: thread.ended.detail, via: info?.via, viaOffline: source?.online === false }
}

type TurnError = NonNullable<ReturnType<typeof turnErrorOf>>

export const createTurnErrors = (ctx: ComposerContext) => {
  const dismissed = sig(new Set<string>())
  const changes = pulse(ctx, [threadSelect, modelsChange])
  ctx.on(threadChange, id => {
    if (id === ctx.threads.current()?.id) changes.bump()
  })
  return {
    current: changes.read(() => turnErrorOf(ctx, dismissed.get())),
    dismiss: (key: string) => dismissed.update(keys => new Set([...keys, key])),
  }
}

export type TurnErrors = ReturnType<typeof createTurnErrors>

const hints: [string, (pc: string) => string][] = [
  [' no longer accepts', pc => `Pair ${pc} with this PC again from Devices, then try again.`],
  [" doesn't share", pc => `Turn sharing back on for this account on ${pc}, then try again.`],
]

const offlineHint = (pc: string) => `The account for this model is on ${pc}. Turn ${pc} on or wake it up, then try again.`

const pcHint = ({ via, viaOffline, text }: TurnError) => {
  if (!via) return undefined
  if (viaOffline) return offlineHint(via)
  const found = hints.find(([words]) => text.startsWith(`${via}${words}`))
  return found ? found[1](via) : undefined
}

const banner = (ctx: ComposerContext, model: Model, errors: TurnErrors, error: TurnError) => {
  const { secondaryAction } = ctx.kit
  const hint = pcHint(error)
  const button = ctx.get(modelButton)
  const pick = hint && button && ctx.get(models)?.list().some(model => !model.via)
  return errorBanner(ctx.kit, {
    text: error.text,
    ...(hint && { hint }),
    retry: () => void retry(ctx).catch(failed => model.fail(errorMessage(failed))),
    actions: pick ? [secondaryAction({ size: 'sm', onClick: () => button.open() }, 'Use a model on this PC')] : [],
    ...(error.detail && { detail: error.detail }),
    dismiss: () => errors.dismiss(error.key),
  })
}

export const turnErrorBanner = (ctx: ComposerContext, model: Model, errors: TurnErrors) =>
  div(
    { class: 'relative flex flex-col', hidden: () => Boolean(model.failure.get()) },
    dynamicChild(
      derive(() => errors.current.get()?.key ?? ''),
      key => {
        const error = errors.current.get()
        return key && error ? banner(ctx, model, errors, error) : null
      },
    ),
  )
