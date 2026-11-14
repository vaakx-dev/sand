import { errorMessage } from '@sand/util'
import { stat } from 'node:fs/promises'
import { join } from 'node:path'
import type { Local } from '../../contract'
import { download, type Source, type Step } from './download'
import { Engine } from './engine'
import { engineEntry, installed, installEngine, platformProblem } from './install'

const MODEL: Source = {
  url: 'https://huggingface.co/handy-computer/parakeet-tdt-0.6b-v2-gguf/resolve/58239cf6d0ecb0af921e7936c1e5e0a8dba91dbb/parakeet-tdt-0.6b-v2-Q8_0.gguf',
  bytes: 729_574_912,
  sha256: 'f0d0e99cebb6d3b83f1f7069b82b5d3c2e39a54545b0da039cb4bafd9c4e5caa',
}

const PROGRESS_MS = 250

interface Files {
  engine: string
  model: string
}

const filesIn = (folder: string): Files => ({ engine: join(folder, 'engine'), model: join(folder, 'models', 'parakeet-tdt-0.6b-v2-Q8_0.gguf') })

const modelPresent = (file: string) => stat(file).then(info => info.size === MODEL.bytes, () => false)

const present = async ({ engine, model }: Files) => (await installed(engine)) && (await modelPresent(model))

const firstStatus = async (files: Files, source: Source): Promise<Local> => {
  const problem = await platformProblem()
  if (problem) return { status: 'unsupported', message: problem }
  return (await present(files)) ? { status: 'ready' } : { status: 'missing', bytes: source.bytes }
}

class LocalSpeech {
  readonly #files: Files
  readonly #source: Source
  readonly #changed: () => void
  readonly #engine: Engine
  #status: Local
  #setup: { done: Promise<void>; abort: AbortController } | undefined
  #lastProgress = 0

  private constructor(files: Files, source: Source, status: Local, changed: () => void) {
    this.#files = files
    this.#source = source
    this.#status = status
    this.#changed = changed
    this.#engine = new Engine({ entry: engineEntry(files.engine), model: files.model, loaded: device => this.#set({ status: 'ready', device }) })
  }

  static async open(folder: string, changed: () => void, source = MODEL) {
    const files = filesIn(folder)
    return new LocalSpeech(files, source, await firstStatus(files, source), changed)
  }

  status() {
    return this.#status
  }

  prepare() {
    if (this.#setup) return this.#setup.done
    const abort = new AbortController()
    const done = this.#setUp(abort.signal).finally(() => (this.#setup = undefined))
    this.#setup = { done, abort }
    return done
  }

  warm() {
    return this.#engine.warm()
  }

  transcribe(file: string) {
    if (this.#status.status !== 'ready') throw new Error('The speech model on this PC isn’t ready yet. See Settings › Voice.')
    return this.#engine.transcribe(file)
  }

  stop() {
    this.#setup?.abort.abort()
    this.#engine.stop()
  }

  async #setUp(signal: AbortSignal) {
    try {
      const problem = await platformProblem()
      if (problem) return this.#set({ status: 'unsupported', message: problem })
      this.#set({ status: 'installing' })
      await installEngine(this.#files.engine)
      signal.throwIfAborted()
      if (!(await modelPresent(this.#files.model))) await download({ source: this.#source, file: this.#files.model, signal, progress: step => this.#progress(step) })
      signal.throwIfAborted()
      this.#set({ status: 'checking' })
      await this.#engine.warm()
    } catch (error) {
      this.#set(signal.aborted ? await firstStatus(this.#files, this.#source) : { status: 'failed', message: errorMessage(error) })
    }
  }

  #progress(step: Step) {
    const now = Date.now()
    const finished = step.status === 'downloading' && step.done === step.total
    if (step.status === 'downloading' && this.#status.status === 'downloading' && !finished && now - this.#lastProgress < PROGRESS_MS) return
    this.#lastProgress = now
    this.#set(step)
  }

  #set(status: Local) {
    this.#status = status
    this.#changed()
  }
}

export { LocalSpeech }
