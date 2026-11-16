import { service } from 'drydock'

export interface AccountPool {
  start(model: string): string
}

export const accountPool = service<AccountPool>('accountPool')
