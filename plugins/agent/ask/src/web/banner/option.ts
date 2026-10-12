import type { Kit } from '@sand/ui-kit/contract'
import type { Child, Props } from '@vaakx-dev/vrui'

const tone = (on: boolean, danger: boolean) => {
  if (!on) return 'bg-neutral-900 text-neutral-200 ring-neutral-700 hover:ring-neutral-500'
  return danger ? 'bg-danger-900 text-danger-200 ring-danger-500' : 'bg-accent-900 text-neutral-100 ring-accent-500'
}

export const optionButton = ({ plainButton }: Kit, on: () => boolean, danger: boolean, { class: extra, ...props }: Props<HTMLButtonElement>, ...children: Child[]) =>
  plainButton({ ...props, class: ['min-w-0 rounded-xl px-3 text-sm ring-1 transition', () => tone(on(), danger), extra] }, ...children)
