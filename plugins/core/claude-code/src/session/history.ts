import type { AppTurn } from '@sand/accounts/contract'
import { stat } from 'node:fs/promises'
import { fieldsOf, type Json } from '../cli/connection'
import { projectsDir } from './files'
import { usageFrom } from './stream'

interface Stamp {
  size: number
  mtimeMs: number
}

interface Ledger {
  files: Map<string, Stamp & { consumed: number }>
  turns: Map<string, AppTurn>
  scanning: Promise<unknown>
}

const ledgers = new Map<string, Ledger>()
const variant = /\[[^\]]*\]$/

const ledgerOf = (projects: string) => {
  const found = ledgers.get(projects) ?? { files: new Map(), turns: new Map(), scanning: Promise.resolve() }
  ledgers.set(projects, found)
  return found
}

const turnOf = (line: string): [string, AppTurn] | undefined => {
  if (!line.includes('"usage"')) return
  const entry = JSON.parse(line) as Json
  const message = fieldsOf(entry.message)
  const key = message.id ?? entry.requestId
  const at = Date.parse(String(entry.timestamp))
  const model = String(message.model).replace(variant, '')
  if (entry.type !== 'assistant' || typeof key !== 'string' || Number.isNaN(at) || model.startsWith('<')) return
  const usage = usageFrom(fieldsOf(message.usage))
  if (!usage.input && !usage.output && !usage.cacheRead && !usage.cacheWrite) return
  const cwd = typeof entry.cwd === 'string' ? entry.cwd : undefined
  return [key, { session: String(entry.sessionId), at, model, usage, ...(cwd && { cwd }) }]
}

const completeLines = async function* (path: string, offset: number) {
  const decoder = new TextDecoder()
  let pending = ''
  for await (const chunk of Bun.file(path).slice(offset).stream()) {
    const lines = (pending + decoder.decode(chunk, { stream: true })).split('\n')
    pending = lines.pop() ?? ''
    yield* lines
  }
}

const tryTurn = (line: string) => {
  try {
    return turnOf(line)
  } catch {
    return undefined
  }
}

const readAppended = async (ledger: Ledger, path: string, { size, mtimeMs }: Stamp) => {
  const before = ledger.files.get(path)
  if (before?.size === size && before.mtimeMs === mtimeMs) return
  let consumed = before?.consumed ?? 0
  for await (const line of completeLines(path, consumed)) {
    consumed += Buffer.byteLength(line) + 1
    const turn = tryTurn(line)
    if (turn) ledger.turns.set(...turn)
  }
  ledger.files.set(path, { size, mtimeMs, consumed })
}

const scan = async (projects: string, since: number) => {
  const ledger = ledgerOf(projects)
  const paths = await Array.fromAsync(new Bun.Glob('**/*.jsonl').scan({ cwd: projects, absolute: true })).catch(() => [])
  for (const path of paths) {
    const info = await stat(path).catch(() => undefined)
    if (info && info.mtimeMs >= since) await readAppended(ledger, path, info)
  }
}

export const readHistory = async (since: number, config?: string): Promise<AppTurn[]> => {
  const projects = projectsDir(config)
  const ledger = ledgerOf(projects)
  const mine = ledger.scanning.then(() => scan(projects, since))
  ledger.scanning = mine.catch(() => undefined)
  await mine
  return [...ledger.turns.values()].filter(turn => turn.at >= since)
}
