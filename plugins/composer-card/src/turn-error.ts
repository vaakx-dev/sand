import { chevron, copyButton, derive, div, dynamicChild, el, icon, iconButton, p, primaryAction, quietButton, secondaryAction, show, sig, span, type Sig } from '@sand/dom'
import type { Context } from 'drydock'
import { bannerPanel } from './components/glass'
import type { Model } from './model'

type TurnError = NonNullable<ReturnType<Model['turnError']['get']>>

const hints: [string, (pc: string) => string][] = [
  [' is offline', pc => `The account for this model is on ${pc}. Turn ${pc} on or wake it up, then try again.`],
  [' no longer accepts', pc => `Pair ${pc} with this PC again from Devices, then try again.`],
  [" doesn't share", pc => `Turn sharing back on for this account on ${pc}, then try again.`],
]

const pcHint = (error: TurnError) => {
  const pc = error.via
  const found = pc && hints.find(([words]) => error.text.startsWith(`${pc}${words}`))
  return found ? found[1](pc) : undefined
}

const detailsToggle = (open: Sig<boolean>) =>
  quietButton({ size: 'sm', 'aria-expanded': () => String(open.get()), onClick: () => open.update(value => !value) }, chevron(() => open.get(), 12), 'Details')

const detailsBlock = (text: string) =>
  div(
    { class: 'flex items-start gap-1 rounded-lg bg-neutral-900 py-1 pr-1 pl-3 text-neutral-400' },
    el('pre', { class: 'max-h-40 min-w-0 flex-1 overflow-auto py-1 font-mono whitespace-pre-wrap wrap-anywhere' }, text),
    copyButton({ text: () => text }),
  )

const banner = (ctx: Context, model: Model, error: TurnError) => {
  const hint = pcHint(error)
  const open = sig(false)
  const pick = hint && ctx.commands?.get('model') && ctx.models?.list().some(model => !model.via)
  const usePc = () => void ctx.commands?.run('model')
  return bannerPanel(
    hint ? 'warning' : 'danger',
    div(
      { class: 'flex flex-col gap-2 pb-1' },
      div(
        { class: 'flex min-h-6 items-center gap-2' },
        span({ class: ['inline-flex shrink-0', hint ? 'text-warning-400' : ''] }, icon('alert', 13)),
        span({ class: ['min-w-0 flex-1 font-medium', hint ? 'text-neutral-100' : ''] }, error.text),
        iconButton({ size: 'sm', title: 'Dismiss', onClick: () => model.dismiss(error.key) }, icon('x', 13)),
      ),
      hint ? p({ class: 'text-neutral-400' }, hint) : null,
      div(
        { class: 'flex flex-wrap items-center gap-2' },
        hint ? primaryAction({ size: 'sm', onClick: model.retryTurn }, icon('retry', 13), 'Try again') : secondaryAction({ size: 'sm', onClick: model.retryTurn }, icon('retry', 13), 'Retry'),
        pick ? secondaryAction({ size: 'sm', onClick: usePc }, 'Use a model on this PC') : null,
        error.detail ? div({ class: 'ml-auto' }, detailsToggle(open)) : null,
      ),
      error.detail ? show(open, () => detailsBlock(error.detail!)) : null,
    ),
  )
}

export const turnErrorBanner = (ctx: Context, model: Model) =>
  div(
    { class: 'relative flex flex-col', hidden: () => Boolean(model.failure.get()) },
    dynamicChild(
      derive(() => model.turnError.get()?.key ?? ''),
      key => {
        const error = model.turnError.get()
        return key && error ? banner(ctx, model, error) : span({ class: 'hidden' })
      },
    ),
  )
