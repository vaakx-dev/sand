import { span, type Child } from '@vaakx-dev/vrui'

export const statusMark = (color: string, glyph: Child) => span({ class: ['inline-flex shrink-0', color] }, glyph)
