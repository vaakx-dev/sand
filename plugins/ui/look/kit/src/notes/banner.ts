import { div, type Child, type Props } from '@vaakx-dev/vrui'

export type BannerTone = 'neutral' | 'accent'

export type BannerProps = Props<HTMLDivElement> & { tone?: BannerTone }

const bannerTones: Record<BannerTone, string> = {
  neutral: 'bg-neutral-800',
  accent: 'bg-accent-950 ring-1 ring-accent-800',
}

export const statusBanner = ({ tone = 'neutral', class: extra, ...props }: BannerProps, ...children: Child[]) =>
  div(
    {
      role: 'status',
      ...props,
      class: ['flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-neutral-300 animate-fade', bannerTones[tone], extra],
    },
    ...children,
  )

export const bannerTitle = (text: Child) => div({ class: 'min-w-0 truncate text-sm font-medium text-neutral-100' }, text)
