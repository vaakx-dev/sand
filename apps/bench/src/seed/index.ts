import { type Bots, bots } from '@sand/bots/contract'
import { type Sessions, sessions } from '@sand/chats/contract'
import { type Media, media } from '@sand/media/contract'
import { type Ledger, ledger } from '@sand/ledger/contract'
import { paths } from '@sand/paths/contract'
import { definePlugin } from 'drydock'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { type Seeded, paragraph, pick, random, topics, turnsFor, write } from './chat'

interface SeedContext {
  sessions: Sessions
  bots: Bots
  media: Media
  paths: { home: string }
  ledger: Ledger
}

const day = 86_400_000

const seed = (ctx: SeedContext) => {
  const marker = join(ctx.paths.home, 'bench-seed.json')
  if (existsSync(marker)) return
  const picture = readFileSync(join(import.meta.dir, 'plot.png'))
  const image = ctx.media.put(new Uint8Array(picture), 'image/png')
  const folder = join(ctx.paths.home, 'bench-work')
  mkdirSync(folder, { recursive: true })
  const now = Date.now()
  const seeded: Seeded = { threads: [], bots: [] }
  const began = performance.now()
  const timings: string[] = []
  ctx.ledger.tx(() => {
    for (let index = 0; index < 48; index++) {
      const threadBegan = performance.now()
      const long = index % 8 === 0
      const count = long ? 160 : 3 + Math.floor(random() * 12)
      const session = ctx.sessions.thread(folder)
      const turns = turnsFor(count, image, true)
      const start = now - (48 - index) * day * 0.5 - count * 120_000
      write(session, turns, start, `t${index}`)
      for (const [at, { agent }] of turns.entries()) {
        if (!agent) continue
        const child = ctx.sessions.agent({ parent: session.id, cwd: folder, title: `Check ${pick(topics)}`, origin: agent })
        write(child, turnsFor(6, undefined, false), start, `t${index}a${at}`)
      }
      const title = `${long ? 'Long: ' : ''}${pick(topics)} ${index}`
      ctx.sessions.rename(session.id, title)
      seeded.threads.push({ id: session.id, marker: `t${index}`, long, title })
      timings.push(`thread ${index} ${count} turns ${Math.round(performance.now() - threadBegan)} ms`)
    }
    for (let index = 0; index < 14; index++) {
      const long = index % 4 === 0
      const title = `Tutor ${index + 1}`
      const bot = ctx.bots.create({ name: title })
      ctx.bots.jobs.create(bot.id, { title: `${title} lessons`, goal: paragraph(2), done: paragraph(1) })
      write(ctx.bots.conversation(bot.id), turnsFor(long ? 80 : 12, image, false), now - (14 - index) * day, `b${index}`)
      seeded.bots.push({ id: bot.id, marker: `b${index}`, long, title })
    }
  })
  timings.push(`total ${Math.round(performance.now() - began)} ms`)
  writeFileSync(join(ctx.paths.home, 'bench-seed.log'), timings.join('\n'))
  writeFileSync(marker, JSON.stringify(seeded))
}

export default definePlugin({
  name: 'bench-seed',
  inject: { sessions, bots, media, paths, ledger },
  apply(ctx) {
    ctx.effect(() => {
      const timer = setTimeout(() => seed(ctx), 20_000)
      return () => clearTimeout(timer)
    })
  },
})
