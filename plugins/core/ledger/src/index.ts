import { paths } from '@sand/paths/contract'
import { expandHome } from '@sand/util/fs'
import { Database } from 'bun:sqlite'
import { definePlugin } from 'drydock'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { z } from 'zod'
import { createLedger, ledger } from './contract'

const open = (path: string) => {
  mkdirSync(dirname(path), { recursive: true })
  const db = new Database(path, { create: true, strict: true })
  db.run('pragma journal_mode = wal')
  db.run('pragma busy_timeout = 5000')
  return db
}

export default definePlugin({
  name: 'ledger',
  description: 'Opens sand.db for the plugins that keep tables in it, and closes it when sand stops',
  inject: { paths },
  config: z.object({ path: z.string().optional() }),
  apply(ctx, config) {
    const { home } = ctx.paths
    const db = open(config.path ? expandHome(config.path, home) : join(home, 'sand.db'))
    ctx.effect(() => () => db.close())
    ctx.provide(ledger, createLedger(db))
  },
})
