import { botTurns } from '@sand/bot-turns/contract'
import { bots } from '@sand/bots/contract'
import { engine } from '@sand/engine/contract'
import { ledger } from '@sand/ledger/contract'
import type { Context } from 'drydock'

export const inject = { bots, botTurns, engine, ledger }

export type BotsMcpContext = Context<typeof inject>
