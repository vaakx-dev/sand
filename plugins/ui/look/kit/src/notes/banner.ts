import { div, type Child, type Props } from '@vaakx-dev/vrui'
import { rowTitle } from '../heads/text'

export type BannerTone = 'neutral' | 'accent'

export type BannerProps = Props<HTMLDivElement> & { tone?: BannerTone }

const bannerTones: Record<BannerTone, string> = {
  neutral: 'bg-neutral-800',
  accent: 'bg-accent-950',
}

export const statusBanner = ({ tone = 'neutral', class: extra, ...props }: BannerProps, ...children: Child[]) =>
  div(
    {
      role: 'status',
      ...props,
      class: ['flex min-h-10 w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-neutral-100', bannerTones[tone], extra],
    },
    ...children,
  )

export const bannerTitle = (text: Child) => rowTitle(text)
