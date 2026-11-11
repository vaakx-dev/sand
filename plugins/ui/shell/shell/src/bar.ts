import { header, type Child } from '@vaakx-dev/vrui'

export const bar = (...children: Child[]) => header({ class: 'flex h-12 min-w-0 shrink-0 items-center gap-1 px-2' }, ...children)
