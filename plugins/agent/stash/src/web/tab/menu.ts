import type { Stashed } from '../../contract'
import { oneLine } from '@sand/kit'
import { copyWithNotice } from '@sand/kit/web'
import type { MenuSpec } from '@sand/protocol'
import type { Context } from 'drydock'
import type { Actions } from '../actions'

const detailOf = ({ content, from }: Stashed) => {
  const images = content.filter(block => block.type === 'image').length
  const files = content.length - images
  const parts = [images && `${images} image${images > 1 ? 's' : ''}`, files && `${files} file${files > 1 ? 's' : ''}`, from?.title]
  return parts.filter(Boolean).join(' · ') || undefined
}

export const rowMenu = (ctx: Context, actions: Actions, item: Stashed, close: () => void): MenuSpec => ({
  title: oneLine(item.label, 60),
  subtitle: detailOf(item),
  actions: [
    {
      id: 'put-back',
      label: 'Put back',
      icon: 'unstash',
      group: 'use',
      tile: true,
      run: () => {
        close()
        actions.putBack(item)
      },
    },
    { id: 'copy', label: 'Copy text', icon: 'copy', group: 'use', tile: true, run: () => copyWithNotice(ctx.notify, item.text, 'text') },
    { id: 'delete', label: 'Delete', icon: 'trash', group: 'remove', danger: true, run: () => actions.discard(item) },
  ],
})
