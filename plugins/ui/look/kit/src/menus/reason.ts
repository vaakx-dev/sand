import { span, type Child } from '@vaakx-dev/vrui'
import { metaLook } from '../heads/text'

export const menuReason = (text: Child) => span({ class: ['ml-auto min-w-0 shrink truncate pl-3', metaLook] }, text)

export const menuLabel = (title: Child, note?: Child) =>
  span({ class: 'flex min-w-0 flex-1 flex-col py-1.5' }, span(title), note ? span({ class: metaLook }, note) : null)
