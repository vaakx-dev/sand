import { div, type Child } from '@vaakx-dev/vrui'

export const errorText = (text: Child) => div({ class: 'text-sm wrap-anywhere whitespace-pre-wrap text-danger-400' }, text)
