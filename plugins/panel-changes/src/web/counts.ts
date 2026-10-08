import { span } from '@sand/dom'

export const counts = (add: () => number, del: () => number) =>
  span(
    { class: 'flex shrink-0 gap-2 text-xs tabular-nums' },
    span({ class: 'text-success-400' }, () => `+${add()}`),
    span({ class: 'text-danger-400' }, () => `−${del()}`),
  )
