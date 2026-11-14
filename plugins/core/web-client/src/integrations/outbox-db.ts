import { keyval } from '@sand/keyval'
import type { OutboxItem } from '../contract'
import type { OutboxSaved } from '../outbox/outbox'

const items = keyval<OutboxItem>('sand-outbox', 'items')

export const outboxDb: OutboxSaved = {
  load: items.all,
  put: item => items.put(item.id, item),
  remove: items.remove,
}
