import type { UserContent } from '@sand/chats/contract'
import { wireHello } from '@sand/devices-contract'
import { mediaView } from '@sand/media/web/contract'
import { uploadBlob, type Resumable } from '@sand/transfers/contract'
import { errorMessage, uuid } from '@sand/util'
import { listen, onTimeout, sig, type Sig } from '@vaakx-dev/vrui'
import { attachmentsAdd } from '../contract'
import type { ShelfContext } from './context'
import type { Held, Upload } from './contract'

interface Place {
  file: File
  device: string | undefined
  state: Sig<Upload>
  resumable: Resumable
}

interface Running extends Place {
  signal: AbortSignal
}

interface Job extends Running {
  cancel(): void
  result: Promise<UserContent>
}

const FILES_AT_ONCE = 3

const CHUNK_TIMEOUT_MS = 120_000

const AUTOMATIC_RETRIES = 2

const RETRY_DELAY_MS = 2_000

const delay = (ms: number) => new Promise<void>(resolve => onTimeout(resolve, ms))

const restart = (resumable: Resumable) => {
  resumable.transfer = uuid()
  resumable.arrived.clear()
}

const keyOf = (device: string | undefined) => device ?? ''

export const createUploads = (ctx: ShelfContext) => {
  const jobs = new WeakMap<File, Map<string, Job>>()
  const version = sig(0)
  const waiting: (() => void)[] = []
  const reconnected = new Set<() => void>()
  let active = 0

  const wake = () => {
    for (const resume of [...reconnected]) resume()
  }
  ctx.on(wireHello, wake)
  listen(window, 'online', wake)

  const reachable = (device: string | undefined) => navigator.onLine && ctx.wire.ready(device)

  const reconnect = (job: Running) =>
    new Promise<void>(resolve => {
      const resume = () => {
        if (!reachable(job.device) && !job.signal.aborted) return
        reconnected.delete(resume)
        stop()
        resolve()
      }
      reconnected.add(resume)
      const stop = listen(job.signal, 'abort', resume)
      resume()
    })

  const slot = () =>
    new Promise<void>(resolve => {
      const take = () => {
        active++
        resolve()
      }
      if (active < FILES_AT_ONCE) take()
      else waiting.push(take)
    })

  const freeSlot = () => {
    active--
    waiting.shift()?.()
  }

  const transfer = async (job: Running) => {
    const fetchFrom = (path: string, init?: RequestInit) => ctx.wire.fetch(path, init, job.device, { timeout: CHUNK_TIMEOUT_MS })
    const progress = (sent: number) => job.state.set({ phase: 'uploading', sent })
    const sent = await uploadBlob(fetchFrom, job.file, { progress, signal: job.signal, resumable: job.resumable })
    try {
      return await ctx.wire.call(attachmentsAdd, { ...sent, name: job.file.name }, job.device)
    } catch (error) {
      restart(job.resumable)
      throw error
    }
  }

  const attempt = async (job: Running, retries: number): Promise<UserContent> => {
    try {
      return await transfer(job)
    } catch (error) {
      if (job.signal.aborted) throw error
      if (!reachable(job.device)) {
        job.state.set({ phase: 'offline', sent: job.state.get().sent })
        await reconnect(job)
        return attempt(job, retries)
      }
      if (retries <= 0) throw error
      job.state.set({ phase: 'retrying', sent: job.state.get().sent })
      await delay(RETRY_DELAY_MS)
      return attempt(job, retries - 1)
    }
  }

  const remember = (file: File, content: UserContent) => {
    if (content.type === 'image') ctx.get(mediaView)?.remember(content.hash, file)
  }

  const failed = (job: Running, error: unknown) => (job.signal.aborted ? 'Removed' : errorMessage(error))

  const run = async (job: Running) => {
    job.state.set({ phase: 'queued', sent: job.state.get().sent })
    await slot()
    try {
      const content = await attempt(job, AUTOMATIC_RETRIES)
      remember(job.file, content)
      job.state.set({ phase: 'done', sent: job.file.size, content })
      return content
    } catch (error) {
      job.state.set({ phase: 'failed', sent: job.state.get().sent, error: failed(job, error) })
      throw error
    } finally {
      freeSlot()
    }
  }

  const launch = (place: Place) => {
    const controller = new AbortController()
    const running = { ...place, signal: controller.signal }
    const job: Job = { ...running, cancel: () => controller.abort(), result: run(running) }
    job.result.catch(() => {})
    const forFile = jobs.get(place.file) ?? new Map<string, Job>()
    forFile.set(keyOf(place.device), job)
    jobs.set(place.file, forFile)
    version.update(count => count + 1)
    return job
  }

  const jobOf = (file: File, device: string | undefined) => jobs.get(file)?.get(keyOf(device))

  const create = (file: File, device: string | undefined) =>
    launch({ file, device, state: sig<Upload>({ phase: 'queued', sent: 0 }), resumable: { transfer: uuid(), arrived: new Set() } })

  const start = (file: File, device: string | undefined) => jobOf(file, device) ?? create(file, device)

  const retried = (job: Job) => (job.state.get().phase === 'failed' ? launch(job) : job)

  const content = async (item: Held, device: string | undefined) => {
    if (!(item instanceof File)) return item
    try {
      return await retried(start(item, device)).result
    } catch (error) {
      throw new Error(`${item.name} didn't upload`, { cause: error })
    }
  }

  return {
    start: (file: File, device: string | undefined) => void start(file, device),
    state(file: File, device: string | undefined) {
      version.get()
      return jobOf(file, device)?.state.get()
    },
    retry(file: File, device: string | undefined) {
      const job = jobOf(file, device)
      if (job) retried(job)
    },
    cancel(file: File) {
      for (const job of jobs.get(file)?.values() ?? []) job.cancel()
      jobs.delete(file)
      version.update(count => count + 1)
    },
    content: (items: Held[], device: string | undefined) => Promise.all(items.map(item => content(item, device))),
  }
}

export type Uploads = ReturnType<typeof createUploads>
