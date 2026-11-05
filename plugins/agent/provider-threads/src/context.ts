import { llm } from '@sand/accounts/contract'
import { entryViews, ledger } from '@sand/chats/contract'
import { context } from '@sand/prompt/contract'
import { tools } from '@sand/tools/contract'
import type { Context } from 'drydock'

export const inject = { llm, ledger, entryViews, context, tools }

export type ThreadsContext = Context<typeof inject>
