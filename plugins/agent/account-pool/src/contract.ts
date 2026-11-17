import type { Session } from '@sand/chats/contract'
import { service } from 'drydock'

export interface Placement {
  model: string
  source: string
}

export interface AccountPool {
  source(session: Session, model: string): string | undefined
  spare(placement: Placement): boolean
  backAt(placement: Placement): number | undefined
}

export const accountPool = service<AccountPool>('accountPool')
