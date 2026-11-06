import { llm } from '@sand/accounts/contract'
import { entryViews } from '@sand/engine/contract'
import { ledger } from '@sand/ledger/contract'
import { tools } from '@sand/tools/contract'
import type { Context } from 'drydock'

export const inject = { llm, ledger, entryViews, tools }

export type ThreadsContext = Context<typeof inject>
