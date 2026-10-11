import { div, icon, p } from '@sand/dom'

export const emptyScreen = () =>
  div(
    { class: 'pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center' },
    div({ class: 'text-neutral-600' }, icon('globe', 28)),
    p({ class: 'text-sm font-medium text-neutral-300' }, 'Nothing open yet'),
    p({ class: 'text-xs text-neutral-500' }, 'Type a URL above, or ask the agent to open one.'),
  )
