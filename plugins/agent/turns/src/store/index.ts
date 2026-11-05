import type { Ledger } from '@sand/chats/contract'
import { createPendingStore } from './pending'
import { createReceipts } from './receipts'
import { schema } from './schema'
import { createTurnStore } from './turns'

export const openStores = (ledger: Ledger) => {
  ledger.migrate('turns', schema)
  return { turns: createTurnStore(ledger.db), pending: createPendingStore(ledger.db), receipts: createReceipts(ledger.db) }
}

export type Stores = ReturnType<typeof openStores>
