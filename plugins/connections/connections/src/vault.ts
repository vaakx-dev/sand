import type { Account, Client } from './contract'

export interface Tokens {
  access: string
  refresh?: string
  expires?: number
}

export type Secret = { tokens: Tokens; client: Client } | { values: Record<string, string> }

export type Entry = { account: Account } & Secret

export interface Data {
  entries: Entry[]
  clients: Record<string, Client>
}
