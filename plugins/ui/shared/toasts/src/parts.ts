import type { IconName, Kit, Tone } from '@sand/ui-kit/contract'
import { div, span } from '@vaakx-dev/vrui'
import type { ToastAction } from './contract'

const toneIcons: Record<Tone, IconName> = {
  neutral: 'info',
  accent: 'info',
  success: 'check',
  warning: 'alert',
  danger: 'alert',
}

export const toneMark = (kit: Kit, tone: Tone) => span({ class: ['inline-flex h-5 shrink-0 items-center', kit.toneText[tone]] }, kit.icon(toneIcons[tone], 'md'))

export const outputBlock = (kit: Kit, output: string) => kit.codeBlock({ copy: () => output, class: 'max-h-40 leading-4' }, output)

const actionButton = (kit: Kit, action: ToastAction, dismiss: () => void) => {
  const press = () => {
    dismiss()
    void action.run()
  }
  return action.primary ? kit.primaryAction({ size: 'sm', onClick: press }, action.label) : kit.secondaryAction({ size: 'sm', onClick: press }, action.label)
}

export const actionRow = (kit: Kit, actions: ToastAction[], dismiss: () => void) =>
  div({ class: 'flex flex-wrap justify-end gap-2' }, ...actions.map(action => actionButton(kit, action, dismiss)))
