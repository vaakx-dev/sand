import { span } from '@vaakx-dev/vrui'

export const linkText = (url: string) => span({ class: 'min-w-0 flex-1 truncate font-mono text-xs text-neutral-300' }, url)
