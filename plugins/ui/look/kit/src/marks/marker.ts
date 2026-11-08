import { div, span, type Child } from '@vaakx-dev/vrui'
import { metaLook } from '../heads/text'
import { icon, type IconName } from '../icons/lucide'
import { toneText, type Tone } from './tones'

export interface MarkerProps {
  icon?: IconName
  tone?: Tone
}

export const markerLine = ({ icon: glyph, tone = 'neutral' }: MarkerProps, ...children: Child[]) =>
  div(
    { class: ['my-3 flex items-center justify-center gap-2', metaLook] },
    glyph ? span({ class: ['inline-flex shrink-0', toneText[tone]] }, icon(glyph, 'sm')) : null,
    ...children,
  )
