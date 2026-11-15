import { cli } from '@sand/config/contract'
import { paths } from '@sand/paths/contract'
import { expandHome } from '@sand/util/fs'
import { readStamp } from '@sand/util/release'
import { Database } from 'bun:sqlite'
import { definePlugin } from 'drydock'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { z } from 'zod'
import { BUSY_TIMEOUT_MS, createLedger, databaseFile, ledger } from './contract'

const open = (path: string) => {
  mkdirSync(dirname(path), { recursive: true })
  const db = new Database(path, { create: true, strict: true })
  db.run('pragma journal_mode = wal')
  db.run(`pragma busy_timeout = ${BUSY_TIMEOUT_MS}`)
  return db
}

export default definePlugin({
  name: 'ledger',
  description: 'Opens sand.db for the plugins that keep tables in it, and closes it when sand stops',
  inject: { paths, cli },
  config: z.object({ path: z.string().optional() }),
  async apply(ctx, config) {
    const { home } = ctx.paths
    const build = await readStamp(join(ctx.cli.builtins, '..'))
    const db = open(config.path ? expandHome(config.path, home) : databaseFile(home))
    ctx.effect(() => () => db.close())
    ctx.provide(ledger, createLedger(db, build))
  },
})
