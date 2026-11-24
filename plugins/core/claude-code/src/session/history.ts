import type { AppTurn } from '@sand/accounts/contract'
import { fieldsOf, type Json, jsonlHistory, listFiles } from '@sand/app-plan'
import { projectsDir } from './files'
import { usageFrom } from './stream'

type Turns = Map<string, AppTurn>

const VARIANT = /\[[^\]]*\]$/

const turnOf = (entry: Json): [string, AppTurn] | undefined => {
  const message = fieldsOf(entry.message)
  const key = message.id ?? entry.requestId
  const at = Date.parse(String(entry.timestamp))
  const model = String(message.model).replace(VARIANT, '')
  if (entry.type !== 'assistant' || typeof key !== 'string' || Number.isNaN(at) || model.startsWith('<')) return
  const usage = usageFrom(fieldsOf(message.usage))
  if (!usage.input && !usage.output && !usage.cacheRead && !usage.cacheWrite) return
  const cwd = typeof entry.cwd === 'string' ? entry.cwd : undefined
  return [key, { session: String(entry.sessionId), at, model, usage, ...(cwd && { cwd }) }]
}

export const claudeHistory = (config?: string) =>
  jsonlHistory<Turns>({
    list: () => listFiles(projectsDir(config), '**/*.jsonl'),
    start: () => new Map(),
    wanted: text => text.includes('"usage"'),
    record(turns, entry) {
      const found = turnOf(entry)
      if (found) turns.set(...found)
    },
    turns: files => [...new Map(files.flatMap(turns => [...turns])).values()],
  })
