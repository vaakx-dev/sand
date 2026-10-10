import { div, span, type Child } from '@vaakx-dev/vrui'

const ruleLine = () => span({ class: 'h-px min-w-4 flex-1 bg-neutral-800' })

export const textRule = (...children: Child[]) =>
  div({ class: 'my-4 flex items-center gap-3 text-xs text-neutral-500' }, ruleLine(), ...children, ruleLine())
