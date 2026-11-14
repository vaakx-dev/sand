import { type Bots, bots } from '@sand/bots/contract'
import { type Message, type Sessions, sessions, type TextBlock } from '@sand/chats/contract'
import { type Media, media, type StoredMedia } from '@sand/media/contract'
import { type Ledger, ledger } from '@sand/ledger/contract'
import { paths } from '@sand/paths/contract'
import { usageRecord } from '@sand/usage/contract'
import { definePlugin } from 'drydock'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const day = 86_400_000

const topics = [
  'binary search trees',
  'the Fourier transform',
  'a React form with validation',
  'Dijkstra on a city map',
  'beam deflection under load',
  'Ohm and Kirchhoff in a ladder circuit',
  'a rate limiter in Go',
  'SQL window functions',
  'gradient descent from scratch',
  'a PID controller for a drone',
  'eigenvalues of a 3x3 matrix',
  'TCP congestion control',
  'a Rust CLI that parses CSV',
  'thermodynamics of a heat pump',
  'the Black-Scholes formula',
  'a Python scraper with retries',
  'Big-O of merge sort',
  'a Kalman filter for GPS',
  'Bayesian updating with dice',
  'a Bun HTTP server with tests',
]

const words =
  'the model splits each step into smaller parts so the student can follow every change and check the result against the expected value before moving on to the next idea in the lesson while the engineer keeps the edge cases in mind'.split(
    ' ',
  )

let state = 7
const random = () => {
  state = (state * 1103515245 + 12345) % 2147483648
  return state / 2147483648
}
const pick = <T>(items: T[]) => items[Math.floor(random() * items.length)]!

const sentence = (length = 12 + Math.floor(random() * 14)) => {
  const said = Array.from({ length }, () => pick(words)).join(' ')
  return `${said[0]!.toUpperCase()}${said.slice(1)}.`
}

const paragraph = (count = 2 + Math.floor(random() * 4)) => Array.from({ length: count }, () => sentence()).join(' ')

const code = (topic: string) => `\`\`\`ts
// ${topic}
export const solve = (input: number[]) => {
  const sorted = [...input].sort((a, b) => a - b)
  let total = 0
  for (const [index, value] of sorted.entries()) {
    total += value * (index + 1)
    if (total > 1_000_000) throw new Error('too large')
  }
  return { sorted, total, mean: total / Math.max(1, sorted.length) }
}
\`\`\``

const reply = (topic: string) =>
  [
    `## ${topic[0]!.toUpperCase()}${topic.slice(1)}`,
    paragraph(),
    '- ' + sentence(8) + '\n- ' + sentence(9) + '\n- ' + sentence(7),
    code(topic),
    paragraph(),
    '| step | value | note |\n| --- | --- | --- |\n| 1 | 0.25 | start |\n| 2 | 0.50 | halfway |\n| 3 | 1.00 | done |',
    'The energy is $E = \\frac{1}{2} m v^2$ and the total is $$\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}$$',
  ].join('\n\n')

const text = (value: string): TextBlock => ({ type: 'text', text: value })

interface Turn {
  user: Message
  steps: Message[]
}

const shellOutput = () => Array.from({ length: 6 + Math.floor(random() * 30) }, (_, line) => `${line + 1}  ${sentence(6)}`).join('\n')

const toolSteps = (topic: string, index: number, image: StoredMedia | undefined, agent?: string): Message[] => {
  const steps: Message[] = []
  const calls = 1 + Math.floor(random() * 3)
  for (let call = 0; call < calls; call++) {
    const id = `call-${index}-${call}-${Math.floor(random() * 1e9)}`
    const kind = call % 3
    const input =
      kind === 0
        ? { command: `bun test test/${topic.split(' ')[0]}.test.ts` }
        : kind === 1
          ? { path: `src/${topic.split(' ').at(-1)}.ts` }
          : { edits: [{ path: 'src/solve.ts', old_string: 'let total = 0', new_string: 'let total = 0\n  let count = 0' }] }
    const name = kind === 0 ? 'shell' : kind === 1 ? 'read' : 'edit'
    steps.push({ role: 'assistant', content: [{ type: 'thinking', thinking: paragraph(2), signature: 'seed' }, text(sentence()), { type: 'tool_call', id, name, input }] })
    steps.push({ role: 'user', content: [{ type: 'tool_result', callId: id, content: [text(shellOutput())] }] })
  }
  if (agent) {
    const id = agent
    steps.push({
      role: 'assistant',
      content: [text('I will hand the proof check to a subagent.'), { type: 'tool_call', id, name: 'agent', input: { label: `Check ${topic}`, task: paragraph(3) } }],
    })
    steps.push({ role: 'user', content: [{ type: 'tool_result', callId: id, content: [text(`Started subagent for ${topic}.`)] }] })
  }
  if (image) {
    const id = `shot-${index}`
    steps.push({ role: 'assistant', content: [text('Here is the plot.'), { type: 'tool_call', id, name: 'read', input: { path: 'out/plot.png' } }] })
    steps.push({
      role: 'user',
      content: [{ type: 'tool_result', callId: id, content: [{ type: 'image', mediaType: image.mediaType, hash: image.hash, size: image.size, width: image.width, height: image.height }] }],
    })
  }
  steps.push({ role: 'assistant', content: [text(reply(topic))] })
  return steps
}

const turnsFor = (count: number, image: StoredMedia | undefined, withAgents: boolean) =>
  Array.from({ length: count }, (_, index): Turn & { agent?: string } => {
    const topic = pick(topics)
    const agent = withAgents && index % 5 === 2 ? `agent-${index}-${Math.floor(random() * 1e9)}` : undefined
    const attach = image && index % 7 === 3 ? image : undefined
    const user: Message = {
      role: 'user',
      content: attach
        ? [text(`Can you explain ${topic}? Here is my sketch.`), { type: 'image', mediaType: attach.mediaType, hash: attach.hash, size: attach.size, width: attach.width, height: attach.height }]
        : [text(`Can you explain ${topic} and show working code? ${sentence()}`)],
    }
    return { user, steps: index % 2 ? [{ role: 'assistant', content: [text(reply(topic))] }] : toolSteps(topic, index, attach, agent), agent }
  })

interface Appendable {
  append(type: string, data: unknown, meta?: { at?: number; turn?: string }): unknown
}

const write = (chat: Appendable, turns: Turn[], start: number, marker: string) => {
  let at = start
  const first = turns[0]!.user.content[0]
  if (first?.type === 'text') first.text = `Start-${marker} ${first.text}`
  const last = turns.at(-1)!.steps.at(-1)!.content.at(-1)
  if (last?.type === 'text') last.text = `${last.text}

End-${marker}`
  for (const { user, steps } of turns) {
    const turn = Bun.randomUUIDv7()
    chat.append('message', user, { at, turn })
    for (const step of steps) {
      at += 4_000
      chat.append('message', step, { at, turn })
      if (step.role === 'assistant') chat.append('usage', usageRecord(undefined, 'replay/script', { input: 1200, output: 400, cacheRead: 9000, cacheWrite: 0 }), { at, turn })
    }
    at += 60_000
  }
}

export interface SeededChat {
  id: string
  marker: string
  long: boolean
  title: string
}

export interface Seeded {
  threads: SeededChat[]
  bots: SeededChat[]
}

interface SeedContext {
  sessions: Sessions
  bots: Bots
  media: Media
  paths: { home: string }
  ledger: Ledger
}

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
