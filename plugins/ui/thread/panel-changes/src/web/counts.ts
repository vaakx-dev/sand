import { span } from '@vaakx-dev/vrui'

const blocks = 5

const blockTone = (index: number, add: number, del: number) => {
  const total = add + del
  const filled = Math.min(blocks, total)
  const green = total ? Math.round((add / total) * filled) : 0
  if (index < green) return 'bg-success-400'
  if (index < filled) return 'bg-danger-400'
  return 'bg-neutral-700'
}

export const counts = (add: () => number, del: () => number) =>
  span(
    { class: 'flex shrink-0 gap-2 text-xs tabular-nums' },
    span({ class: 'text-success-400' }, () => `+${add()}`),
    span({ class: 'text-danger-400' }, () => `−${del()}`),
  )

export const diffstat = (add: () => number, del: () => number) =>
  span(
    { class: 'flex shrink-0 gap-px', 'aria-hidden': 'true' },
    Array.from({ length: blocks }, (_, index) => span({ class: ['h-2 w-2 rounded-sm', () => blockTone(index, add(), del())] })),
  )
