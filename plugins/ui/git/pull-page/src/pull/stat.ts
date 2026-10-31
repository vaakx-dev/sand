import type { Kit } from '@sand/ui-kit/contract'
import { span } from '@vaakx-dev/vrui'

export const lineStat = (kit: Kit, add: () => number, del: () => number) =>
  span(
    { class: 'flex shrink-0 items-center gap-1 tabular-nums', title: () => `${add()} added, ${del()} removed` },
    span({ class: kit.toneText.success }, () => `+${add()}`),
    span({ class: kit.toneText.danger }, () => `−${del()}`),
  )
