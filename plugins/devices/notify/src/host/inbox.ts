import { readState, writePrivateJson } from '@sand/util/fs'
import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { z } from 'zod'
import { type Notice, noticeSchema } from '../contract'

interface Held {
  notice: Notice
  at: number
}

interface Listener {
  device: string
  token: string
  stream: ReadableStreamDefaultController<Uint8Array>
  beat: Timer
}

interface Opening {
  device: string
  token: string
  seen?: string
}

const KEEP_MS = 24 * 60 * 60 * 1000
const MOST_HELD = 100
const BEAT_MS = 30_000
const encoder = new TextEncoder()
const BEAT = encoder.encode(':\n\n')
const STREAM_HEADERS = { 'content-type': 'text/event-stream', 'cache-control': 'no-store' }

const savedSchema = z.record(z.string(), z.array(z.object({ notice: noticeSchema(), at: z.number() })))

const eventOf = ({ notice }: Held) => encoder.encode(`id: ${notice.tag}\ndata: ${JSON.stringify(notice)}\n\n`)

const fresh = (held: Held[], now: number) => held.filter(entry => now - entry.at < KEEP_MS).slice(-MOST_HELD)

const unseenAfter = (held: Held[], seen: string | undefined) => held.slice(held.findIndex(entry => entry.notice.tag === seen) + 1)

class Inbox {
  readonly #file: string
  readonly #held: Map<string, Held[]>
  readonly #listeners = new Set<Listener>()
  #saved = Promise.resolve()

  constructor(file: string, held: Map<string, Held[]>) {
    this.#file = file
    this.#held = held
  }

  static async load(home: string) {
    const file = join(home, 'notify', 'inbox.json')
    const saved = (await readState(file, data => savedSchema.safeParse(data).data)) ?? {}
    return new Inbox(file, new Map(Object.entries(saved)))
  }

  async post(device: string, notice: Notice) {
    const entry = { notice, at: Date.now() }
    this.#held.set(device, fresh([...(this.#held.get(device) ?? []), entry], entry.at))
    for (const listener of this.#listeners) if (listener.device === device) listener.stream.enqueue(eventOf(entry))
    await this.#save()
  }

  async open({ device, token, seen }: Opening) {
    const unseen = fresh(unseenAfter(this.#held.get(device) ?? [], seen), Date.now())
    this.#held.set(device, unseen)
    await this.#save()
    return new Response(this.#stream(device, token, unseen), { headers: STREAM_HEADERS })
  }

  async keep(tokenOf: (device: string) => string | undefined) {
    for (const listener of this.#listeners) if (tokenOf(listener.device) !== listener.token) this.#end(listener)
    const gone = [...this.#held.keys()].filter(device => !tokenOf(device))
    if (!gone.length) return
    for (const device of gone) this.#held.delete(device)
    await this.#save()
  }

  close() {
    for (const listener of this.#listeners) this.#end(listener)
  }

  #stream(device: string, token: string, unseen: Held[]) {
    let listener: Listener
    return new ReadableStream<Uint8Array>({
      start: stream => {
        listener = { device, token, stream, beat: setInterval(() => stream.enqueue(BEAT), BEAT_MS) }
        this.#listeners.add(listener)
        stream.enqueue(BEAT)
        for (const entry of unseen) stream.enqueue(eventOf(entry))
      },
      cancel: () => this.#forget(listener),
    })
  }

  #forget(listener: Listener) {
    clearInterval(listener.beat)
    this.#listeners.delete(listener)
  }

  #end(listener: Listener) {
    this.#forget(listener)
    listener.stream.close()
  }

  #save() {
    const write = async () => {
      await mkdir(dirname(this.#file), { recursive: true })
      await writePrivateJson(this.#file, Object.fromEntries(this.#held))
    }
    this.#saved = this.#saved.catch(() => {}).then(write)
    return this.#saved
  }
}

export { Inbox }
