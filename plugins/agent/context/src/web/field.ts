import { div, span, type Child } from '@vaakx-dev/vrui'

export const field = (name: string, value: Child) => div({ class: 'flex min-w-0 flex-col gap-1 text-sm text-neutral-100 wrap-anywhere' }, span({ class: 'text-xs text-neutral-400' }, name), value)
