import type { MenuSpec } from '@sand/dom'
import type { Context } from 'drydock'
import { copier } from '../menu/copy'
import type { Attached, Files } from './files'

export const attachmentMenu = (ctx: Context<'threads'>, files: Files, item: Attached, detail: string): MenuSpec => ({
  title: item.name,
  subtitle: detail,
  actions: [
    { id: 'copy-name', label: 'Copy name', icon: 'copy', group: 'copy', run: copier(ctx, item.name, 'file name') },
    { id: 'remove', label: 'Remove', icon: 'x', group: 'remove', danger: true, quick: true, run: () => files.remove(item.id) },
  ],
})
