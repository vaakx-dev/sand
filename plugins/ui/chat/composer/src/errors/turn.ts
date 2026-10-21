import { modelPill } from '@sand/model-panel/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { models } from '@sand/web-client/contract'
import { derive, div, dynamicChild, el, show, sig, span, type Sig } from '@vaakx-dev/vrui'
import type { ComposerContext } from '../context'
import { bannerPanel } from '../dock/glass'
import type { Model, TurnError } from '../model'

const hints: [string, (pc: string) => string][] = [
  [' is offline', pc => `The account for this model is on ${pc}. Turn ${pc} on or wake it up, then try again.`],
  [' no longer accepts', pc => `Pair ${pc} with this PC again from Devices, then try again.`],
  [" doesn't share", pc => `Turn sharing back on for this account on ${pc}, then try again.`],
]

const pcHint = ({ via, text }: TurnError) => {
  const found = via && hints.find(([words]) => text.startsWith(`${via}${words}`))
  return found ? found[1](via) : undefined
}

const detailsToggle = ({ chevron, quietButton }: Kit, open: Sig<boolean>) =>
  quietButton({ size: 'sm', 'aria-expanded': () => String(open.get()), onClick: open.toggle() }, chevron(() => open.get(), 14), 'Details')

const detailsBlock = ({ copyButton }: Kit, text: string) =>
  div(
    { class: 'flex items-start gap-1 rounded-lg bg-neutral-900 py-1 pr-1 pl-3 text-neutral-400' },
    el('pre', { class: 'max-h-40 min-w-0 flex-1 overflow-auto py-1 font-mono whitespace-pre-wrap wrap-anywhere' }, text),
    copyButton({ text: () => text }),
  )

const details = (kit: Kit, detail: string) => {
  const open = sig(false)
  return { toggle: div({ class: 'ml-auto' }, detailsToggle(kit, open)), block: show(open, () => detailsBlock(kit, detail)) }
}

const banner = (ctx: ComposerContext, model: Model, error: TurnError) => {
  const { closeButton, icon, note, primaryAction, secondaryAction } = ctx.kit
  const hint = pcHint(error)
  const pill = ctx.get(modelPill)
  const pick = hint && pill && ctx.get(models)?.list().some(model => !model.via)
  const more = error.detail ? details(ctx.kit, error.detail) : undefined
  return bannerPanel(
    hint ? 'warning' : 'danger',
    div(
      { class: 'flex flex-col gap-2 pb-1' },
      div(
        { class: 'flex min-h-6 items-center gap-2' },
        span({ class: ['inline-flex shrink-0', hint ? 'text-warning-400' : ''] }, icon('alert', 14)),
        span({ class: ['min-w-0 flex-1 font-medium', hint ? 'text-neutral-100' : ''] }, error.text),
        closeButton({ title: 'Dismiss', size: 'sm', onClick: () => model.dismiss(error.key) }),
      ),
      hint && note(hint),
      div(
        { class: 'flex flex-wrap items-center gap-2' },
        hint ? primaryAction({ size: 'sm', onClick: model.retryTurn }, icon('retry', 14), 'Retry') : secondaryAction({ size: 'sm', onClick: model.retryTurn }, icon('retry', 14), 'Retry'),
        pick && secondaryAction({ size: 'sm', onClick: () => pill.open() }, 'Use a model on this PC'),
        more?.toggle,
      ),
      more?.block,
    ),
  )
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
