import { span } from '@vaakx-dev/vrui'

export const frame = (displayMode: boolean) => span({ class: displayMode && 'mb-3 block overflow-x-auto overflow-y-hidden p-1 last:mb-0' })
