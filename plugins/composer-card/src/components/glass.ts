import { div, read, SPACE, type Child, type MaybeReactive, type Props } from '@sand/dom'

export type Tint = 'plain' | 'accent' | 'danger'

export type GlassProps = Props<HTMLDivElement> & { tint?: MaybeReactive<Tint> }

const tints: Record<Tint, string> = {
  plain: 'cc-glass ring-neutral-700',
  accent: 'bg-accent-950 ring-accent-500',
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
  tuckedPanel({ class: 'absolute z-0 max-h-80 overflow-auto px-2', style: { left: '0', right: '0', bottom: `calc(100% - ${tuck})` }, hidden }, ...children)
