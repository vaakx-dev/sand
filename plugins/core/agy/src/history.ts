import type { AppTurn } from '@sand/accounts/contract'
import { Database } from 'bun:sqlite'
import { readdir, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import { basename, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Message } from './wire'

interface Snapshot {
  key: string
  modifiedMs: number
}

interface CachedConversation {
  key: string
  turns: AppTurn[]
}

interface Conversation {
  session: string
  cwd?: string
  modifiedMs: number
  database: Database
}

const DATABASE_SUFFIX = '.db'
const WAL_SUFFIX = '-wal'
const MS_PER_SECOND = 1000
const NS_PER_MS = 1e6
const REQUEST = 1
const REQUEST_COUNTS = 4
const REQUEST_MODEL = 19
const REQUEST_ATTRIBUTE = 20
const COUNT_INPUT = 2
const COUNT_OUTPUT = 3
const COUNT_CACHE_READ = 5
const ATTRIBUTE_NAME = 1
const ATTRIBUTE_VALUE = 2
const LAST_STEP_ATTRIBUTE = 'last_step_index'
const STEP_STARTED = 1
const TIME_SECONDS = 1
const TIME_NANOS = 2
const TRAJECTORY_WORKSPACE = 7

function conversationsFolder(folder?: string): string {
  return join(folder ?? join(homedir(), '.gemini'), 'antigravity-cli', 'conversations')
}

async function snapshotOf(path: string): Promise<Snapshot | undefined> {
  const file = await stat(path).catch(() => undefined)
  if (!file) return undefined
  const wal = await stat(path + WAL_SUFFIX).catch(() => undefined)
  return {
    key: [file.mtimeMs, file.size, wal?.mtimeMs, wal?.size].join(':'),
    modifiedMs: Math.max(file.mtimeMs, wal?.mtimeMs ?? 0),
  }
}

function millisecondsOf(time: Message): number | undefined {
  const seconds = time.int(TIME_SECONDS)
  return seconds === undefined ? undefined : seconds * MS_PER_SECOND + (time.int(TIME_NANOS) ?? 0) / NS_PER_MS
}

function workspaceOf(database: Database): string | undefined {
  const row = database.query<{ data: Uint8Array }, []>('select data from trajectory_metadata_blob limit 1').get()
  const uri = row ? new Message(row.data).text(TRAJECTORY_WORKSPACE) : undefined
  return uri?.startsWith('file://') ? fileURLToPath(uri) : undefined
}

function stepStartedAt(database: Database, index: number): number | undefined {
  const row = database.query<{ metadata: Uint8Array }, [number]>('select metadata from steps where idx = ?').get(index)
  const started = row ? new Message(row.metadata).child(STEP_STARTED) : undefined
  return started ? millisecondsOf(started) : undefined
}

function lastStepOf(request: Message): number | undefined {
  const attribute = request.children(REQUEST_ATTRIBUTE).find(entry => entry.text(ATTRIBUTE_NAME) === LAST_STEP_ATTRIBUTE)
  const value = attribute?.text(ATTRIBUTE_VALUE)
  return value === undefined ? undefined : Number(value)
}

function turnOf(data: Uint8Array, { session, cwd, modifiedMs, database }: Conversation): AppTurn | undefined {
  const request = new Message(data).child(REQUEST)
  const counts = request?.child(REQUEST_COUNTS)
  const model = request?.text(REQUEST_MODEL)
  if (!request || !counts || !model) return undefined
  const lastStep = lastStepOf(request)
  const startedAt = lastStep === undefined ? undefined : stepStartedAt(database, lastStep + 1)
  return {
    session,
    at: startedAt ?? modifiedMs,
    model,
    cwd,
    usage: {
      input: counts.int(COUNT_INPUT) ?? 0,
      output: counts.int(COUNT_OUTPUT) ?? 0,
      cacheRead: counts.int(COUNT_CACHE_READ) ?? 0,
      cacheWrite: 0,
    },
  }
}

function readTurns(path: string, modifiedMs: number): AppTurn[] {
  const database = new Database(path, { readonly: true })
  try {
    const conversation = { session: basename(path, DATABASE_SUFFIX), cwd: workspaceOf(database), modifiedMs, database }
    const rows = database.query<{ data: Uint8Array }, []>('select data from gen_metadata order by idx').all()
    return rows.flatMap(row => turnOf(row.data, conversation) ?? [])
  } finally {
    database.close()
  }
}

class History {
  private readonly cache = new Map<string, CachedConversation>()
  private scans: Promise<unknown> = Promise.resolve()

  constructor(private readonly folder?: string) {}

  turnsSince(since: number): Promise<AppTurn[]> {
    const scan = this.scans.then(() => this.scan(since))
    this.scans = scan.catch(() => {})
    return scan
  }

  private async scan(since: number): Promise<AppTurn[]> {
    const folder = conversationsFolder(this.folder)
    const names = (await readdir(folder).catch(() => [])).filter(name => name.endsWith(DATABASE_SUFFIX))
    this.forgetMissing(new Set(names.map(name => join(folder, name))))
    const conversations = await Promise.all(names.map(name => this.turnsOf(join(folder, name), since)))
    return conversations.flat().filter(turn => turn.at >= since)
  }

  private forgetMissing(present: Set<string>) {
    for (const path of this.cache.keys()) if (!present.has(path)) this.cache.delete(path)
  }

  private async turnsOf(path: string, since: number): Promise<AppTurn[]> {
    const snapshot = await snapshotOf(path)
    if (!snapshot || snapshot.modifiedMs < since) return []
    const cached = this.cache.get(path)
    if (cached?.key === snapshot.key) return cached.turns
    try {
      const turns = readTurns(path, snapshot.modifiedMs)
      this.cache.set(path, { key: snapshot.key, turns })
      return turns
    } catch {
      return cached?.turns ?? []
    }
  }
}

function agyHistory(folder?: string): (since: number) => Promise<AppTurn[]> {
  const history = new History(folder)
  return since => history.turnsSince(since)
}

export { agyHistory }
