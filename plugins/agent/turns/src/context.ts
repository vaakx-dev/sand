import { llm } from '@sand/accounts/contract'
import { ledger, sessions } from '@sand/chats/contract'
import { cli } from '@sand/config/contract'
import { modelSettings } from '@sand/model/contract'
import { context } from '@sand/prompt/contract'
import { tools } from '@sand/tools/contract'
import type { Context } from 'drydock'

export const inject = { llm, context, tools, sessions, ledger, modelSettings, cli }

export type TurnsContext = Context<typeof inject>
