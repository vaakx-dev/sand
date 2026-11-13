import { type Child, div } from '@vaakx-dev/vrui'

export const band = (look: string, ...children: Child[]) => div({ class: [look, 'border-b border-neutral-800 px-4 py-3'] }, ...children)
