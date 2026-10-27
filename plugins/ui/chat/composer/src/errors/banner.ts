import type { Kit } from '@sand/ui-kit/contract'
import { div, show, sig, span, type Child, type MaybeReactive } from '@vaakx-dev/vrui'
import { bannerPanel } from '../dock/glass'

export interface ErrorBanner {
  text: MaybeReactive<string>
  hint?: string
  retry?: () => void
  actions?: Child[]
  detail?: string
  dismiss(): void
}

const details = ({ codeBlock, expandToggle }: Kit, detail: string) => {
  const open = sig(false)
  return { toggle: expandToggle(open, 'Details'), block: show(open, () => codeBlock({ copy: () => detail, class: 'max-h-40' }, detail)) }
}

export const errorBanner = (kit: Kit, { text, hint, retry, actions = [], detail, dismiss }: ErrorBanner) => {
  const { closeButton, icon, secondaryAction } = kit
  const more = detail ? details(kit, detail) : undefined
  const buttons = [retry && secondaryAction({ size: 'sm', onClick: retry }, 'Retry'), ...actions, more?.toggle].filter(Boolean)
  return bannerPanel(
    div(
      { role: 'alert', class: 'flex flex-col gap-2 pb-1' },
      div(
        { class: 'flex min-h-6 items-start gap-2 text-danger-400' },
        span({ class: 'inline-flex h-6 shrink-0 items-center' }, icon('alert', 'md')),
        span({ class: 'min-w-0 flex-1 leading-6' }, text),
        closeButton({ title: 'Dismiss', size: 'sm', surface: 'raised', onClick: dismiss }),
      ),
      hint ? div({ class: 'pl-6 text-neutral-400' }, hint) : null,
      buttons.length ? div({ class: 'flex flex-wrap items-center gap-2 pl-6' }, ...buttons) : null,
      more?.block,
    ),
  )
}
