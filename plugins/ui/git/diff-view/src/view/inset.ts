import { div, type Child } from '@vaakx-dev/vrui'

export const inset = (child: Child) => div({ class: 'px-4' }, child)
