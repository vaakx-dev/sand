import type { Kit } from '@sand/ui-kit/contract'
import { show, sig, type Child, type MaybeReactive } from '@vaakx-dev/vrui'
import { bannerRow } from '../dock/banner'

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
  const more = detail ? details(kit, detail) : undefined
  const buttons = [...(retry ? [kit.secondaryAction({ size: 'sm', onClick: retry }, 'Retry')] : []), ...actions, ...(more ? [more.toggle] : [])]
  return bannerRow(kit.banner({ tone: 'danger', title: text, ...(hint && { detail: hint }), actions: buttons, dismiss }, ...(more ? [more.block] : [])))
}
