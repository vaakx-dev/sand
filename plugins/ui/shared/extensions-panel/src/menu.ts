import { copyText, type MenuSpec } from '@sand/dom'
import type { Context } from 'drydock'
import type { CardModel } from './card'

export const copyId = async (ctx: Context<'extensions'>, id: string) => {
  const copied = await copyText(id)
  ctx.notify?.push(copied ? 'Copied id' : 'Could not copy the id', { level: copied ? 'info' : 'error' })
}

export const extensionMenu = ({ extension, locked }: CardModel, toggle: () => void, copyId: () => void): MenuSpec => ({
  title: extension.id,
  subtitle: extension.description,
  actions: [
    ...(locked
      ? []
      : [{ id: 'toggle', label: extension.configured ? 'Disable' : 'Enable', icon: extension.configured ? 'x' : 'check', group: 'toggle', run: toggle }]),
    { id: 'copy-id', label: 'Copy id', icon: 'copy', group: 'copy', run: copyId },
  ],
})
