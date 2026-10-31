import { span, type Child } from '@vaakx-dev/vrui'

export const menuReason = (text: Child) => span({ class: 'ml-auto min-w-0 shrink truncate pl-3 text-xs text-neutral-500' }, text)
