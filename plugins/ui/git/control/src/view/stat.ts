import { read, show, span, type MaybeReactive } from '@vaakx-dev/vrui'

export const diffStat = (add: MaybeReactive<number>, del: MaybeReactive<number>) =>
  span(
    { class: 'flex shrink-0 items-center gap-1 font-mono text-xs tabular-nums' },
    show(
      () => read(add) > 0,
      () => span({ class: 'text-success-400' }, () => `+${read(add)}`),
    ),
    show(
      () => read(del) > 0,
      () => span({ class: 'text-danger-400' }, () => `−${read(del)}`),
    ),
  )
