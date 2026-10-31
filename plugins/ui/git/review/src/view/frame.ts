import { type Child, div } from '@vaakx-dev/vrui'

export const noteFrame = (...children: Child[]) =>
  div({ class: 'border-b border-neutral-800' }, div({ class: 'flex flex-col gap-2 bg-neutral-900 p-3' }, ...children))

export const buttonRow = (...children: Child[]) => div({ class: 'flex flex-wrap items-center justify-end gap-2' }, ...children)
