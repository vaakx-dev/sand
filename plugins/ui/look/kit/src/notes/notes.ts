import { div, span, type Child } from '@vaakx-dev/vrui'
import { icon, type IconName } from '../icons/lucide'

export type CalloutTone = 'warning' | 'danger' | 'neutral'

export type CalloutLook = CalloutTone | { tone: CalloutTone; icon: IconName }

const calloutTones: Record<CalloutTone, string> = {
  warning: 'bg-warning-950 text-warning-400',
  danger: 'bg-danger-950 text-danger-400',
  neutral: 'bg-neutral-800 text-neutral-100',
}

export const callout = (look: CalloutLook, ...children: Child[]) => {
  const { tone, icon: glyph } = typeof look === 'string' ? { tone: look, icon: 'alert' as const } : look
  return div(
    { class: ['flex items-start gap-2 rounded-xl px-3 py-2 text-sm', calloutTones[tone]] },
    span({ class: 'inline-flex h-5 shrink-0 items-center' }, icon(glyph, 'md')),
    ...children,
  )
}

export const errorText = (text: Child) => div({ class: 'text-sm wrap-anywhere whitespace-pre-wrap text-danger-400' }, text)
