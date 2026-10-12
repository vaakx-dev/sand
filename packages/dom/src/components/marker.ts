import { div, span, type Child } from '@vaakx-dev/vrui'
import { icon, type IconName } from '../icons/lucide'
import type { Tone } from './marks'

export interface MarkerProps {
  icon?: IconName
  tone?: Tone
}

const iconTones: Record<Tone, string> = {
  neutral: 'text-neutral-500',
  accent: 'text-accent-400',
  success: 'text-success-400',
  warning: 'text-warning-400',
  danger: 'text-danger-400',
  orange: 'text-orange-400',
  sky: 'text-sky-400',
}

export const markerLine = ({ icon: glyph, tone = 'neutral' }: MarkerProps, ...children: Child[]) =>
  div(
    { class: 'my-3 flex items-center justify-center gap-2 text-xs text-neutral-500' },
    glyph ? span({ class: ['inline-flex shrink-0', iconTones[tone]] }, icon(glyph, 14)) : null,
    ...children,
  )
