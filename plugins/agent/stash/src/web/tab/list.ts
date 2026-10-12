import type { Stashed } from '../../contract'
import { ago } from '@sand/kit'
import type { ContextMenu } from '@sand/ui-kit/contract'
import { div, img, list, span, type Sig } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import type { Actions } from '../actions'
import type { Items } from '../items'
import { rowMenu } from './menu'

type Ctx = Context<'kit'>

const imageOf = ({ content }: Stashed) => {
  const block = content.find(item => item.type === 'image')
  return block?.type === 'image' && typeof block.data === 'string' ? `data:${block.mediaType};base64,${block.data}` : undefined
}

export const stashList = (ctx: Ctx, items: Items, actions: Actions, context: ContextMenu, close: () => void) => {
  const { groupLabel, popoverItem } = ctx.kit

  const row = (entry: Sig<Stashed>) => {
    const image = imageOf(entry.get())
    return popoverItem(
      {
        icon: image ? undefined : 'message',
        class: 'py-2',
        ...context.target(
          () => rowMenu(ctx, actions, entry.get(), close),
          () => {
            close()
            actions.putBack(entry.get())
          },
        ),
      },
      image ? img({ class: 'h-4 w-4 shrink-0 rounded-sm object-cover', alt: '', src: image }) : null,
      span({ class: 'min-w-0 flex-1 truncate' }, () => entry.get().label),
      span({ class: 'shrink-0 text-xs text-neutral-500' }, () => ago(entry.get().at)),
    )
  }

  return div(
    { class: 'flex flex-col' },
    groupLabel('Stash'),
    list(items.list, item => item.id, row, div({ class: 'flex max-h-80 flex-col overflow-auto' })),
  )
}
