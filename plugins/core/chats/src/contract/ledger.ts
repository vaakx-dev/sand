import type { Database } from 'bun:sqlite'

export interface Ledger {
  db: Database
  tx<T>(fn: () => T): T
  migrate(owner: string, steps: string[][]): void
}
