import { contentName } from '@sand/attachments/web/contract'
import type { ComposerView } from '@sand/composer/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { ago, oneLine } from '@sand/util'
import { div, list, span, type Sig } from '@vaakx-dev/vrui'
import type { Entry } from '../contract'

export interface ListParts {
  kit: Kit
  entries: Sig<Entry[]>
  here: ComposerView
  phone: () => boolean
  remove(entry: Entry): Promise<unknown>
  take(entry: Entry): void
}

const metaOf = (entry: Entry) => {
  const files = entry.content.filter(block => block.type !== 'context').length
  return [entry.chat, ago(entry.at), files ? `${files} attachment${files === 1 ? '' : 's'}` : ''].filter(Boolean).join(' · ')
}

const titleOf = (entry: Entry) => oneLine(entry.text, 200) || entry.content.map(contentName).join(', ')

const deleteAction = (remove: ListParts['remove'], entry: Entry) => ({
  id: 'delete',
  label: 'Delete',
  icon: 'trash',
  danger: true,
  confirm: 'Delete this stashed message? It can’t be brought back.',
  run: () => remove(entry),
})

const row = ({ kit, here, phone, remove, take }: ListParts, entry: Entry, close: () => void) =>
  div(
    { class: 'group flex min-w-0 items-center gap-1 rounded-md pr-1 hover:bg-neutral-700' },
    kit.plainButton(
      {
        class: 'flex min-w-0 flex-1 flex-col px-2 py-1.5 text-left',
        onClick: () => {
          close()
          take(entry)
          here.restore({ text: entry.text, content: entry.content })
        },
      },
      span({ class: 'min-w-0 truncate text-sm text-neutral-100' }, titleOf(entry)),
      kit.metaLine(metaOf(entry)),
    ),
    kit.closeButton({ size: 'sm', title: 'Delete', class: () => (phone() ? '' : 'opacity-0 group-hover:opacity-100'), onClick: event => kit.confirm(event)(deleteAction(remove, entry)) }),
  )

export const stashRows = (parts: ListParts, close: () => void) =>
  list(
    parts.entries,
    entry => entry.id,
    entry => row(parts, entry.get(), close),
    div({ class: 'flex flex-col' }),
  )
