import { libraryRoot } from '@sand/util'
import { listen } from '@vaakx-dev/vrui'
import sqljs from 'sql.js/package.json' with { type: 'json' }
import type { BindParams, QueryExecResult } from 'sql.js'
import { sqliteRoute } from '../contract'

interface Engine {
  exec(sql: string, params?: BindParams): Promise<QueryExecResult[]>
  close(): void
}

interface Reply {
  id: number
  results?: QueryExecResult[]
  error?: string
}

interface Waiting {
  resolve(reply: Reply): void
  reject(error: Error): void
}

const WORKER_URL = `${libraryRoot(sqliteRoute, sqljs.version)}dist/worker.sql-wasm.js`

class WorkerEngine implements Engine {
  readonly #worker = new Worker(WORKER_URL)
  readonly #waiting = new Map<number, Waiting>()
  #asked = 0

  constructor() {
    listen(this.#worker, 'message', (event: MessageEvent<Reply>) => this.#answer(event.data))
    listen(this.#worker, 'error', () => this.#failAll(new Error("the SQLite engine didn't load")))
  }

  open(data: Uint8Array<ArrayBuffer>) {
    return this.#ask({ action: 'open', buffer: data }, [data.buffer])
  }

  async exec(sql: string, params?: BindParams) {
    return (await this.#ask({ action: 'exec', sql, params })).results ?? []
  }

  close() {
    this.#worker.terminate()
    this.#failAll(new Error('the database was closed'))
  }

  #ask(message: Record<string, unknown>, transfer: Transferable[] = []) {
    const id = ++this.#asked
    return new Promise<Reply>((resolve, reject) => {
      this.#waiting.set(id, { resolve, reject })
      this.#worker.postMessage({ ...message, id }, transfer)
    })
  }

  #answer(reply: Reply) {
    const waiting = this.#waiting.get(reply.id)
    this.#waiting.delete(reply.id)
    if (reply.error === undefined) return waiting?.resolve(reply)
    waiting?.reject(new Error(reply.error))
  }

  #failAll(error: Error) {
    this.#waiting.forEach(waiting => waiting.reject(error))
    this.#waiting.clear()
  }
}

const workerEngine = async (data: Uint8Array<ArrayBuffer>): Promise<Engine> => {
  const engine = new WorkerEngine()
  await engine.open(data).catch((error: unknown) => {
    engine.close()
    throw error
  })
  return engine
}

export { workerEngine, type Engine }
