import type { AppTurn } from '@sand/accounts/contract'
import { stat } from 'node:fs/promises'
import { join } from 'node:path'
import { fieldsOf, type Json } from '../server/rpc'

interface Rollout {
  size: number
  session?: string
  cwd?: string
  model?: string
  lastTotalTokens?: number
  turns: AppTurn[]
}

interface Listed {
  path: string
  size: number
  mtimeMs: number
}

const ROLLOUT_GLOBS = [
  { folder: 'sessions', pattern: '**/rollout-*.jsonl' },
  { folder: 'archived_sessions', pattern: '*.jsonl' },
]

const RECORD_KINDS = ['session_meta', 'turn_context', 'token_count']

const listRollouts = async (home: string): Promise<Listed[]> => {
  const found = ROLLOUT_GLOBS.map(({ folder, pattern }) => Array.fromAsync(new Bun.Glob(pattern).scan({ cwd: join(home, folder), absolute: true, onlyFiles: true })).catch(() => []))
  const paths = (await Promise.all(found)).flat()
  return Promise.all(paths.map(async path => ({ path, ...(await stat(path).then(({ size, mtimeMs }) => ({ size, mtimeMs }))) })))
}

async function* completeLines(path: string, start: number, end: number) {
  const decoder = new TextDecoder()
  let pending = ''
  for await (const chunk of Bun.file(path).slice(start, end).stream()) {
    const parts = (pending + decoder.decode(chunk, { stream: true })).split('\n')
    pending = parts.pop() ?? ''
    yield* parts
  }
}

const turnOf = (rollout: Rollout, line: Json): AppTurn | undefined => {
  const info = fieldsOf(fieldsOf(line.payload).info)
  const last = fieldsOf(info.last_token_usage)
  const totalTokens = Number(fieldsOf(info.total_token_usage).total_tokens ?? 0)
  const at = Date.parse(String(line.timestamp))
  if (!rollout.session || !rollout.model || !Number(last.total_tokens) || totalTokens === rollout.lastTotalTokens || Number.isNaN(at)) return undefined
  rollout.lastTotalTokens = totalTokens
  const cached = Number(last.cached_input_tokens ?? 0)
  return {
    session: rollout.session,
    at,
    model: rollout.model,
    usage: { input: Number(last.input_tokens ?? 0) - cached, output: Number(last.output_tokens ?? 0), cacheRead: cached, cacheWrite: Number(last.cache_write_input_tokens ?? 0) },
    ...(rollout.cwd && { cwd: rollout.cwd }),
  }
}

const absorb = (rollout: Rollout, text: string) => {
  const kind = RECORD_KINDS.find(name => text.includes(`"type":"${name}"`))
  if (!kind) return
  const line: Json = JSON.parse(text)
  const payload = fieldsOf(line.payload)
  if (kind === 'session_meta' && !rollout.session) {
    rollout.session = String(payload.id)
    rollout.cwd = typeof payload.cwd === 'string' ? payload.cwd : undefined
  }
  if (kind === 'turn_context' && typeof payload.model === 'string') rollout.model = payload.model
  if (kind !== 'token_count') return
  const turn = turnOf(rollout, line)
  if (turn) rollout.turns.push(turn)
}

const readAppended = async (path: string, rollout: Rollout, size: number) => {
  let consumed = rollout.size
  for await (const text of completeLines(path, rollout.size, size)) {
    consumed += Buffer.byteLength(text) + 1
    try {
      absorb(rollout, text)
    } catch {}
  }
  rollout.size = consumed
}

export const rolloutHistory = (home: string) => {
  const rollouts = new Map<string, Rollout>()
  let scanning: { since: number; done: Promise<void> } | undefined

  const refresh = async ({ path, size }: Listed) => {
    const known = rollouts.get(path)
    if (known?.size === size) return
    const rollout = known && known.size < size ? known : { size: 0, turns: [] }
    rollouts.set(path, rollout)
    await readAppended(path, rollout, size)
  }

  const scan = async (since: number) => {
    const listed = await listRollouts(home)
    const paths = new Set(listed.map(({ path }) => path))
    for (const path of rollouts.keys()) if (!paths.has(path)) rollouts.delete(path)
    await Promise.all(listed.filter(({ mtimeMs }) => mtimeMs >= since).map(refresh))
  }

  const scanned = (since: number) => {
    if (scanning && scanning.since <= since) return scanning.done
    const earlier = scanning?.done.catch(() => {})
    const done = (earlier ? earlier.then(() => scan(since)) : scan(since)).finally(() => {
      if (scanning?.done === done) scanning = undefined
    })
    scanning = { since, done }
    return done
  }

  return async (since: number): Promise<AppTurn[]> => {
    await scanned(since)
    return [...rollouts.values()].flatMap(({ turns }) => turns).filter(({ at }) => at >= since)
  }
}
