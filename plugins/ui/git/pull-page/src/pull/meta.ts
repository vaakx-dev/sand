import { type Child, div } from '@vaakx-dev/vrui'

export const metaRow = (...children: Child[]) => div({ class: 'flex items-center gap-1.5 text-xs text-neutral-400' }, ...children)
