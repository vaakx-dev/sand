import { p, type Child } from '@vaakx-dev/vrui'

export const sheetText = (...children: Child[]) => p({ class: 'text-sm text-neutral-400' }, ...children)
