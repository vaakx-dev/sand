import { bots } from '@sand/bots/contract'
import { sessions } from '@sand/chats/contract'
import { turns } from '@sand/turns-contract/contract'
import { watches } from '@sand/watches/contract'
import type { Context } from 'drydock'

export const inject = { watches, turns, sessions, bots }

export type BotWatchesContext = Context<typeof inject>
