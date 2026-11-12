import { div, type Child } from '@vaakx-dev/vrui'

export const bannerRow = (...children: Child[]) => div({ class: 'pb-2' }, ...children)
