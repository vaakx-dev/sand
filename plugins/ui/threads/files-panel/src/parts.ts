import type { Kit } from '@sand/ui-kit/contract'
import { div, type Child } from '@vaakx-dev/vrui'

export const page = (...children: Child[]) => div({ class: 'absolute inset-0 overflow-auto bg-neutral-950' }, ...children)

export const bar = ({ layer, paneHead }: Kit, led: boolean, ...children: Child[]) =>
  paneHead({ led, class: [layer.sticky, 'sticky top-0 left-0 bg-neutral-950'] }, ...children)

export const pathLine = (path: Child) => div({ class: 'sticky left-0 px-4 pb-2 text-xs text-neutral-500 wrap-anywhere' }, path)

export const inset = (child: Child) => div({ class: 'sticky left-0 pr-3 pl-4' }, child)

export const failed = (what: string, error: string) => `Couldn't ${what}: ${error}`
