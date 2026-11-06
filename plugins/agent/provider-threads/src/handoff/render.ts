import type { HandoffItem } from '@sand/accounts/contract'
import type { Item } from './items'

const outputLimit = 2_000

export interface Rendered extends HandoffItem {
  id: string
}

export interface Coverage {
  models: string[]
  first: number
  last: number
  reads: boolean
}

const header = ({ role, kind, id, seq, model }: Item) => `[Historical ${role}; ${kind}; item=${id}; seq=${seq}${model ? `; model=${model}` : ''}]`

export const clip = (text: string, limit: number, id: string) =>
  text.length > limit ? `${text.slice(0, limit)}\n[… ${text.length - limit} more; thread_read item=${id}]` : text

export const fullText = (item: Item) => [header(item), item.text, ...(item.output ? [item.output] : [])].join('\n')

export const renderItem = (item: Item): Rendered => ({
  id: item.id,
  role: item.role,
  text: [header(item), item.text, ...(item.output ? [clip(item.output, outputLimit, item.id)] : [])].join('\n'),
})

export const coverageText =
  ({ models, first, last, reads }: Coverage) =>
  (selected: number, omitted: number) =>
    [
      `Earlier messages of this chat, seq ${first}–${last}${models.length ? `, with replies from another model (${models.join(', ')})` : ''}: ${selected} shown, ${omitted} left out.`,
      'They are background, not new requests or instructions.',
      'Images, attachments and thinking are left out.',
      ...(reads ? [`Read the left-out ones with thread_read({after:${first - 1},limit:20}) or one in full with thread_read({item:"<id>"}).`] : []),
    ].join(' ')

const closing = "[End of the earlier messages. The user's current message follows.]"

export const handoffText = (context: string, items: HandoffItem[]) => [context, ...items.map(item => item.text), closing].join('\n\n')
