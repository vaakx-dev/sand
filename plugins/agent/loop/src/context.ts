import { llm } from '@sand/accounts/contract'
import { context } from '@sand/prompt/contract'
import { tools } from '@sand/tools/contract'
import type { Context } from 'drydock'

export const inject = { llm, context, tools }

export type LoopsContext = Context<typeof inject>
