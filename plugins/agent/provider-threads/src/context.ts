import { llm } from '@sand/accounts/contract'
import { entryViews, ledger } from '@sand/chats/contract'
import { context } from '@sand/prompt/contract'
import type { Context } from 'drydock'

export const inject = { llm, ledger, entryViews, context }

export type ThreadsContext = Context<typeof inject>
