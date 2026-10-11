import { div, read, SPACE, type Child, type MaybeReactive, type Props } from '@sand/dom'

type Tint = 'plain' | 'accent' | 'warning' | 'danger'

type GlassProps = Props<HTMLDivElement> & { tint?: MaybeReactive<Tint> }

const tints: Record<Tint, string> = {
  plain: 'bg-neutral-800/90 backdrop-blur-md ring-neutral-700',
  accent: 'bg-accent-950 ring-accent-500',
  warning: 'bg-warning-950 text-neutral-300 ring-warning-900',
  danger: 'bg-danger-950 text-danger-300 ring-danger-900',
}

const tuck = SPACE['4']

export const glassPanel = ({ tint = 'plain', class: extra, ...props }: GlassProps, ...children: Child[]) =>
  div({ ...props, class: ['ring-1 transition', () => tints[read(tint)], extra] }, ...children)

const tuckedPanel = ({ class: extra, ...props }: GlassProps, ...children: Child[]) =>
  glassPanel({ ...props, class: ['mx-6 rounded-2xl pt-2 pb-6 animate-rise', extra] }, ...children)

export const bannerPanel = (tint: Tint, ...children: Child[]) =>
  tuckedPanel({ tint, class: 'relative px-3 text-xs', style: { marginBottom: `calc(-1 * ${tuck})` } }, ...children)

export const completionPopup = (hidden: () => boolean, ...children: Child[]) =>
  tuckedPanel({ class: 'absolute inset-x-0 z-0 max-h-80 overflow-auto px-2', style: { bottom: `calc(100% - ${tuck})` }, hidden }, ...children)
