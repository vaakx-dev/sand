import { span, type Child } from '@sand/dom'

export const statusMark = (color: string, glyph: Child) => span({ class: ['inline-flex shrink-0', color] }, glyph)
