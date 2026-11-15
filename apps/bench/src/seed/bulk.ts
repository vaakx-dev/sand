import { type Sessions, sessions } from '@sand/chats/contract'
import { type Ledger, ledger } from '@sand/ledger/contract'
import { paths } from '@sand/paths/contract'
import { definePlugin } from 'drydock'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { type Seeded, turnsFor, write } from './chat'

interface BulkContext {
  sessions: Sessions
  paths: { home: string }
  ledger: Ledger
}

const MESSAGES = 100_000
const TURNS_PER_CHAT = 120
const START_DELAY_MS = 1000
const HOUR_MS = 3_600_000

const messagesIn = (turns: ReturnType<typeof turnsFor>) => turns.reduce((count, turn) => count + 1 + turn.steps.length, 0)

const seed = async (ctx: BulkContext) => {
  const marker = join(ctx.paths.home, 'bench-seed.json')
  if (existsSync(marker)) return
  const folder = join(ctx.paths.home, 'bench-work')
  mkdirSync(folder, { recursive: true })
  const seeded: Seeded = { threads: [], bots: [] }
  let written = 0
  for (let index = 0; written < MESSAGES; index++) {
    const turns = turnsFor(TURNS_PER_CHAT, undefined, false)
    const id = ctx.ledger.tx(() => {
      const session = ctx.sessions.thread(folder)
      write(session, turns, Date.now() - (index + 1) * HOUR_MS, `bulk${index}`)
      return session.id
    })
    seeded.threads.push({ id, marker: `bulk${index}`, long: true, title: id })
    written += messagesIn(turns)
    await Bun.sleep(0)
  }
  writeFileSync(marker, JSON.stringify(seeded))
}

export default definePlugin({
  name: 'bench-bulk',
  inject: { sessions, paths, ledger },
  apply(ctx) {
    ctx.effect(() => {
      const timer = setTimeout(() => void seed(ctx).catch(error => ctx.report(error)), START_DELAY_MS)
      return () => clearTimeout(timer)
    })
  },
})
