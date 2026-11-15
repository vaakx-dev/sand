import type { Call, FromWorker, Start, ToWorker } from './protocol'

interface Reply {
  text: string
  failed: boolean
}

interface Sandboxed {
  code: string
  names: string[]
  signal: AbortSignal
  call(name: string, input: unknown): Promise<Reply>
}

interface Outcome {
  printed: string[]
  value?: string
  error?: string
}

const WORKER = new URL('./worker.ts', import.meta.url).href

const parsed = (input: string): unknown => JSON.parse(input)

const runSandboxed = ({ code, names, signal, call }: Sandboxed) =>
  new Promise<Outcome>(resolve => {
    const worker = new Worker(WORKER)
    const stop = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT)
    const printed: string[] = []
    let ended = false

    const send = (message: ToWorker) => {
      if (!ended) worker.postMessage(message)
    }

    const finish = (outcome: Omit<Outcome, 'printed'>) => {
      if (ended) return
      ended = true
      Atomics.store(new Int32Array(stop), 0, 1)
      worker.terminate()
      signal.removeEventListener('abort', abort)
      resolve({ printed, ...outcome })
    }

    const abort = () => finish({})

    const answer = async ({ id, name, input }: Call) => {
      const reply = await call(name, parsed(input))
      send({ type: 'answer', id, ...reply })
    }

    const receive = ({ data }: MessageEvent<FromWorker>) => {
      switch (data.type) {
        case 'log':
          return void printed.push(data.text)
        case 'call':
          return void answer(data)
        case 'end':
          return finish(data)
      }
    }

    if (signal.aborted) return abort()
    signal.addEventListener('abort', abort, { once: true })
    worker.onmessage = receive
    worker.onerror = event => finish({ error: event.message })
    send({ type: 'start', code, names, stop } satisfies Start)
  })

export { runSandboxed, type Outcome, type Reply }
