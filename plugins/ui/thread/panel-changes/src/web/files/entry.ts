import type { Kit } from '@sand/ui-kit/contract'
import { dynamicChild, span } from '@vaakx-dev/vrui'
import { nameOf } from './path'

export const fileEntry = ({ icon, okMark }: Kit, path: string, viewed: () => boolean) => [
  span({ class: 'inline-flex w-4 shrink-0 justify-center text-neutral-500' }, dynamicChild(viewed, done => (done ? okMark() : icon('file', 14)))),
  span({ class: ['min-w-0 flex-1 truncate font-mono text-xs', () => viewed() && 'text-neutral-500'], title: path }, nameOf(path)),
]
