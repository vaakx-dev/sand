import { read, show, span, type MaybeReactive } from '@vaakx-dev/vrui'
import { toneText } from './tones'

export const lineStat = (add: MaybeReactive<number>, del: MaybeReactive<number>) =>
  span(
    { class: 'flex shrink-0 items-center gap-1 text-xs tabular-nums', title: () => `${read(add)} added, ${read(del)} removed` },
    show(
      () => read(add) > 0,
      () => span({ class: toneText.success }, () => `+${read(add)}`),
    ),
    show(
      () => read(del) > 0,
      () => span({ class: toneText.danger }, () => `−${read(del)}`),
    ),
  )
