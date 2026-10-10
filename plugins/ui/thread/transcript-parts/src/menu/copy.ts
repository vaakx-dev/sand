import { copyWithNotice, type NavAction } from '@sand/dom'
import type { Context } from 'drydock'

export const copyAction =
  (ctx: Context) =>
  (id: string, label: string, text: () => string, what: string): NavAction => ({
    id,
    label,
    icon: 'copy',
    tile: true,
    run: () => copyWithNotice(ctx.notify, text(), what),
  })
