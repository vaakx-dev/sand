import { serial } from '@sand/util'
import type { Subprocess } from 'bun'
import { join } from 'node:path'
import { z } from 'zod'
import type { Reply } from './messages'

interface EngineOptions {
  entry: string
  model: string
  loaded(device: string): void
}

const WORKER = join(import.meta.dir, 'worker.ts')

const IDLE_MS = 5 * 60_000

const reply: z.ZodType<Reply> = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('loaded'), device: z.string() }),
  z.object({ kind: z.literal('failed'), error: z.string() }),
  z.object({ kind: z.literal('text'), id: z.number(), text: z.string() }),
  z.object({ kind: z.literal('error'), id: z.number(), error: z.string() }),
])

class Worker {
  readonly ready: Promise<string>
  readonly #proc: Subprocess
  readonly #started = Promise.withResolvers<string>()
  readonly #pending = new Map<number, PromiseWithResolvers<string>>()
  #next = 0

  constructor({ entry, model, loaded }: EngineOptions, exited: (worker: Worker) => void) {
    this.ready = this.#started.promise
    this.#proc = Bun.spawn([process.execPath, WORKER, entry, model], {
      stdin: 'ignore',
      stdout: 'ignore',
      stderr: 'ignore',
      serialization: 'json',
      windowsHide: true,
      ipc: message => this.#receive(reply.parse(message), loaded),
    })
    void this.#proc.exited.then(code => {
      this.#fail(new Error(`The speech engine stopped unexpectedly (exit code ${code})`))
      exited(this)
    })
  }

  transcribe(file: string) {
    const id = ++this.#next
    const waiting = Promise.withResolvers<string>()
    this.#pending.set(id, waiting)
    this.#proc.send({ id, file })
    return waiting.promise
  }

  stop() {
    this.#proc.kill()
  }

  #receive(reply: Reply, loaded: (device: string) => void) {
    switch (reply.kind) {
      case 'loaded':
        loaded(reply.device)
        return this.#started.resolve(reply.device)
      case 'failed':
        this.#started.reject(new Error(reply.error))
        return this.stop()
      case 'text':
        return this.#settle(reply.id, waiting => waiting.resolve(reply.text))
      case 'error':
        return this.#settle(reply.id, waiting => waiting.reject(new Error(reply.error)))
    }
  }

  #settle(id: number, finish: (waiting: PromiseWithResolvers<string>) => void) {
    const waiting = this.#pending.get(id)
    this.#pending.delete(id)
    if (waiting) finish(waiting)
  }

  #fail(error: Error) {
    this.#started.reject(error)
    for (const waiting of this.#pending.values()) waiting.reject(error)
    this.#pending.clear()
  }
}

class Engine {
  readonly #options: EngineOptions
  readonly #queue = serial()
  #worker: Worker | undefined
  #idle: ReturnType<typeof setTimeout> | undefined

  constructor(options: EngineOptions) {
    this.#options = options
  }

  warm() {
    return this.#running().ready
  }

  transcribe(file: string) {
    return this.#queue(async () => {
      const worker = this.#running()
      await worker.ready
      try {
        return await worker.transcribe(file)
      } finally {
        this.#rest()
      }
    })
  }

  stop() {
    clearTimeout(this.#idle)
    this.#worker?.stop()
    this.#worker = undefined
  }

  #running() {
    this.#rest()
    this.#worker ??= new Worker(this.#options, worker => {
      if (this.#worker === worker) this.#worker = undefined
    })
    return this.#worker
  }

  #rest() {
    clearTimeout(this.#idle)
    this.#idle = setTimeout(() => this.stop(), IDLE_MS)
  }
}

export { Engine }
