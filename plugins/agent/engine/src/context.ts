import { llm } from '@sand/accounts/contract'
import { ledger } from '@sand/ledger/contract'
import { cli } from '@sand/config/contract'
import { tools } from '@sand/tools/contract'
import type { Context } from 'drydock'

export const inject = { llm, tools, ledger, cli }

export type EngineContext = Context<typeof inject>
