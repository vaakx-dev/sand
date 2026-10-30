import type { RouteCaller } from '../contract'
import { createExpiring } from './expiring'

const nonceLife = 60_000
const ticketLife = 30_000

export const createNonces = () => createExpiring<true>(nonceLife)

export const createTickets = () => createExpiring<RouteCaller>(ticketLife)

export type Nonces = ReturnType<typeof createNonces>
export type Tickets = ReturnType<typeof createTickets>
