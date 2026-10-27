import { div, SPACE, type Child, type Props } from '@vaakx-dev/vrui'

export const tuck = SPACE['4']

export const glassPanel = ({ class: extra, ...props }: Props<HTMLDivElement>, ...children: Child[]) =>
  div({ ...props, class: ['bg-neutral-800/90 backdrop-blur-md', extra] }, ...children)

const tuckedPanel = ({ class: extra, ...props }: Props<HTMLDivElement>, ...children: Child[]) =>
  glassPanel({ ...props, class: ['mx-6 rounded-xl pt-2 pb-6', extra] }, ...children)

export const bannerPanel = (...children: Child[]) => tuckedPanel({ class: 'relative -mb-4 px-3 text-sm' }, ...children)

export const completionPopup = (hidden: () => boolean, ...children: Child[]) =>
  tuckedPanel({ class: 'absolute inset-x-0 z-0 max-h-80 overflow-auto px-2 animate-fade', style: { bottom: `calc(100% - ${tuck})` }, hidden }, ...children)
