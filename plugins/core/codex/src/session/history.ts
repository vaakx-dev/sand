import type { AppTurn } from '@sand/accounts/contract'
import { fieldsOf, type Json, jsonlHistory, listFiles } from '@sand/app-plan'
import { join } from 'node:path'

interface Rollout {
  session?: string
  cwd?: string
  model?: string
  lastTotalTokens?: number
  turns: AppTurn[]
}

const ROLLOUT_GLOBS = [
  { folder: 'sessions', pattern: '**/rollout-*.jsonl' },
  { folder: 'archived_sessions', pattern: '*.jsonl' },
]

const RECORD_KINDS = ['session_meta', 'turn_context', 'token_count']

const listRollouts = async (home: string) => (await Promise.all(ROLLOUT_GLOBS.map(({ folder, pattern }) => listFiles(join(home, folder), pattern)))).flat()

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

const absorb = (rollout: Rollout, line: Json) => {
  const payload = fieldsOf(line.payload)
  if (line.type === 'session_meta' && !rollout.session) {
    rollout.session = String(payload.id)
    rollout.cwd = typeof payload.cwd === 'string' ? payload.cwd : undefined
  }
  if (line.type === 'turn_context' && typeof payload.model === 'string') rollout.model = payload.model
  if (payload.type !== 'token_count') return
  const turn = turnOf(rollout, line)
  if (turn) rollout.turns.push(turn)
}

export const rolloutHistory = (home: string) =>
  jsonlHistory<Rollout>({
    list: () => listRollouts(home),
    start: () => ({ turns: [] }),
    wanted: text => RECORD_KINDS.some(kind => text.includes(`"type":"${kind}"`)),
    record: absorb,
    turns: rollouts => rollouts.flatMap(({ turns }) => turns),
  })
