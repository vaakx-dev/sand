import { div, type Child } from '@vaakx-dev/vrui'
import { metaLook } from '../heads/text'

export const textRule = (...children: Child[]) => div({ class: ['my-4 flex min-w-0 items-center justify-center', metaLook] }, ...children)
