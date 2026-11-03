import { span, type Child } from '@vaakx-dev/vrui'

export const menuReason = (text: Child) => span({ class: 'ml-auto min-w-0 shrink truncate pl-3 text-xs text-neutral-500' }, text)

export const menuLabel = (title: Child, note?: Child) =>
  span({ class: 'flex min-w-0 flex-1 flex-col py-1.5' }, span(title), note ? span({ class: 'text-xs text-neutral-500' }, note) : null)
