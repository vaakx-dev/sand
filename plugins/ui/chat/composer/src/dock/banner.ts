import { div, type Child } from '@vaakx-dev/vrui'

export const bannerRow = (...children: Child[]) => div({ class: 'px-4 pb-3 text-sm' }, ...children)
