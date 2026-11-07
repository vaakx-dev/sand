import { botTurns } from '@sand/bot-turns/contract'
import { bots } from '@sand/bots/contract'
import { watches } from '@sand/watches/contract'
import type { Context } from 'drydock'

export const inject = { watches, botTurns, bots }

export type BotWatchesContext = Context<typeof inject>
