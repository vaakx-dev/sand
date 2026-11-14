import { sseFrames, untilAborted } from '@sand/util'
import type { PullRef } from '../contract'
import type { Client } from './client'
import { apiUrl, githubHost } from './endpoint'
import { GitHubError } from './errors'

type Ending = 'reconnect' | 'renew' | 'stop'

export interface EventTimings {
  silenceMs: number
  backoffMs(failures: number): number
}

interface Subscription {
  id: string | number
  events_url: string
}

const EVENT_TYPES = [
  'com.github.pull_request.review.submitted.v1',
  'com.github.pull_request.head.changed.v1',
  'com.github.pull_request.state.changed.v1',
  'com.github.pull_request.merge_conflict.v1',
  'com.github.pull_request.check_suite.status.changed.v1',
]
const STREAM_END = 'github.stream.end'
const SILENCE_MS = 45_000
const HEALTHY_MS = 120_000
const REFUSED_PAUSE_MS = 3_600_000
const LIMIT_PAUSE_MS = 600_000
const MOST_FAILURES = 6
const MOST_BACKOFF_MS = 60_000

const endingOf = (data: string): Ending => {
  try {
    return JSON.parse(data).outcome === 'subscription_ended' ? 'renew' : 'reconnect'
  } catch {
    return 'reconnect'
  }
}

const backoffMs = (failures: number) => Math.min(MOST_BACKOFF_MS, 1_000 * 2 ** failures) * (0.5 + Math.random() / 2)

const pause = (ms: number, signal: AbortSignal) => untilAborted(Bun.sleep(ms), signal).catch(() => {})

async function* tap(body: AsyncIterable<Uint8Array>, heard: () => void) {
  for await (const chunk of body) {
    heard()
    yield chunk
  }
}

const onApi = (url: string) => URL.canParse(url) && new URL(url).origin === apiUrl

const timings: EventTimings = { silenceMs: SILENCE_MS, backoffMs }

export const createEvents = (client: Client, { silenceMs, backoffMs: waitMs }: EventTimings = timings) => {
  const pausedUntil = new Map<string, number>()

  const paused = (resource: string) => Math.max(pausedUntil.get(githubHost) ?? 0, pausedUntil.get(resource) ?? 0) > Date.now()

  const refusal = (error: unknown, resource: string) => {
    const status = error instanceof GitHubError ? error.status : undefined
    if (status === 404) pausedUntil.set(resource, Date.now() + REFUSED_PAUSE_MS)
    if (status === 403) pausedUntil.set(githubHost, Date.now() + REFUSED_PAUSE_MS)
    if (status === 422) pausedUntil.set(githubHost, Date.now() + LIMIT_PAUSE_MS)
  }

  const subscribe = async (resource: string) => {
    if (paused(resource)) return undefined
    try {
      const found = await client.rest<Subscription>('POST', '/event-subscriptions', { resource_url: resource, event_types: EVENT_TYPES })
      return onApi(found.events_url) ? found : undefined
    } catch (error) {
      refusal(error, resource)
      return undefined
    }
  }

  const unsubscribe = (id: string | number) => void client.rest('DELETE', `/event-subscriptions/${id}`).catch(() => {})

  async function* connection(url: string, signal: AbortSignal): AsyncGenerator<void, Ending> {
    const silent = new AbortController()
    let timer = setTimeout(() => silent.abort(), silenceMs)
    const heard = () => {
      clearTimeout(timer)
      timer = setTimeout(() => silent.abort(), silenceMs)
    }
    try {
      const response = await client.stream(url, AbortSignal.any([signal, silent.signal]))
      if (response.status === 403 || response.status === 404) return 'stop'
      if (response.status !== 200 || !response.body) return 'reconnect'
      yield
      for await (const frame of sseFrames(tap(response.body, heard))) {
        if (frame.event === STREAM_END) return endingOf(frame.data)
        yield
      }
      return 'reconnect'
    } catch {
      return signal.aborted ? 'stop' : 'reconnect'
    } finally {
      clearTimeout(timer)
    }
  }

  async function* follow(url: string, signal: AbortSignal): AsyncGenerator<void, boolean> {
    let failures = 0
    while (!signal.aborted) {
      const opened = Date.now()
      let changes = 0
      const stream = connection(url, signal)
      let step = await stream.next()
      while (!step.done) {
        changes++
        yield
        step = await stream.next()
      }
      const healthy = changes > 1 || Date.now() - opened >= HEALTHY_MS
      failures = healthy ? 0 : failures + 1
      if (step.value === 'stop') return false
      if (step.value === 'renew') return true
      if (failures > MOST_FAILURES) return false
      await pause(waitMs(failures), signal)
    }
    return false
  }

  return async function* changes({ repo, number }: PullRef, signal: AbortSignal): AsyncIterable<void> {
    const resource = `https://${githubHost}/${repo}/pull/${number}`
    while (!signal.aborted) {
      const subscription = await subscribe(resource)
      if (!subscription) return
      try {
        const renew = yield* follow(subscription.events_url, signal)
        if (!renew) return
      } finally {
        unsubscribe(subscription.id)
      }
      await pause(waitMs(0), signal)
    }
  }
}
