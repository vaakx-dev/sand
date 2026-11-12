import { div, span, type Child, type Props } from '@vaakx-dev/vrui'
import { closeButton } from '../buttons/close'
import { secondaryText } from '../heads/text'
import { icon, type IconName } from '../icons/lucide'
import { spinner } from '../marks/marks'
import { toneText } from '../marks/tones'

export type BannerTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger'

export type BannerProps = Omit<Props<HTMLDivElement>, 'title'> & {
  tone?: BannerTone
  icon?: IconName | 'spinner'
  title: Child
  detail?: Child
  actions?: Child[]
  dismiss?: () => void
}

const toneIcons: Record<BannerTone, IconName> = {
  neutral: 'info',
  accent: 'info',
  success: 'check',
  warning: 'alert',
  danger: 'alert',
}

const mark = (tone: BannerTone, glyph: IconName | 'spinner') =>
  span({ class: ['inline-flex h-6 shrink-0 items-center', toneText[tone]] }, glyph === 'spinner' ? spinner('md') : icon(glyph, 'md'))

export const banner = ({ tone = 'neutral', icon: glyph = toneIcons[tone], title, detail, actions = [], dismiss, class: extra, ...props }: BannerProps, ...below: Child[]) =>
  div(
    {
      role: tone === 'danger' ? 'alert' : 'status',
      ...props,
      class: ['flex flex-col gap-2 rounded-lg bg-neutral-800 px-3 py-2 text-sm text-neutral-100', extra],
    },
    div(
      { class: 'flex items-start gap-2' },
      mark(tone, glyph),
      div(
        { class: 'flex min-w-0 flex-1 flex-wrap items-start gap-x-3 gap-y-2' },
        div(
          { class: 'flex min-w-0 grow flex-col' },
          span({ class: 'leading-6 wrap-anywhere' }, title),
          detail ? div({ class: 'wrap-anywhere whitespace-pre-wrap' }, secondaryText(detail)) : null,
        ),
        actions.length ? div({ class: 'flex flex-wrap items-center gap-2' }, ...actions) : null,
      ),
      dismiss ? closeButton({ title: 'Dismiss', size: 'sm', surface: 'raised', onClick: dismiss }) : null,
    ),
    below.length ? div({ class: 'flex flex-col pl-6' }, ...below) : null,
  )
