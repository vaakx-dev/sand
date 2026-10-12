import { dynamicChild, icon, okMark, span } from '@sand/dom'
import { nameOf } from './path'

export const fileEntry = (path: string, viewed: () => boolean) => [
  span({ class: 'inline-flex w-4 shrink-0 justify-center text-neutral-500' }, dynamicChild(viewed, done => (done ? okMark() : icon('file', 13)))),
  span({ class: ['min-w-0 flex-1 truncate font-mono', () => viewed() && 'text-neutral-500'], title: path }, nameOf(path)),
]
