import { h2, type Child } from '@vaakx-dev/vrui'

export const sectionHeading = (...children: Child[]) =>
  h2({ class: 'flex min-h-8 min-w-0 items-center gap-2 px-2 text-xs font-medium text-neutral-500' }, ...children)
