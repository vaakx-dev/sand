import type { BannerTone, Kit, Tone } from '@sand/ui-kit/contract'
import type { ToastAction } from './contract'

export const bannerTone: Record<Tone, BannerTone> = {
  neutral: 'neutral',
  accent: 'accent',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
  run: 'neutral',
  merged: 'success',
}

export const outputBlock = (kit: Kit, output: string) => kit.codeBlock({ copy: () => output, class: 'max-h-40 leading-4' }, output)

export const actionButton = (kit: Kit, action: ToastAction, dismiss: () => void) => {
  const press = () => {
    dismiss()
    void action.run()
  }
  return action.primary
    ? kit.secondaryAction({ size: 'sm', onClick: press }, action.label)
    : kit.quietButton({ size: 'sm', surface: 'raised', onClick: press }, action.label)
}
