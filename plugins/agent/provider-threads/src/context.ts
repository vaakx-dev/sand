import { llm } from '@sand/accounts/contract'
import { entryViews } from '@sand/engine/contract'
import { ledger } from '@sand/ledger/contract'
import type { Context } from 'drydock'

export const inject = { llm, ledger, entryViews }

export type ThreadsContext = Context<typeof inject>
