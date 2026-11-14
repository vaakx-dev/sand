import type { GitHub } from '@sand/github/contract'
import type { Kind, KindContext } from '@sand/watches/contract'
import { z } from 'zod'
import { changesOf, seenOf } from './changes'
import { readPull } from './read'

export interface KindTimings {
  pollMs: number
  settleMs: number
}

export const pullInput = z.object({
  repo: z
    .string()
    .regex(/^[\w.-]+\/[\w.-]+$/, 'use owner/name')
    .describe('The repository, as owner/name'),
  number: z.number().int().positive().describe('The pull request number'),
})

export type PullInput = z.output<typeof pullInput>

const rests = (signal: AbortSignal) => {
  let nudge = () => {}
  return {
    nudge: () => nudge(),
    rest: (ms: number) =>
      new Promise<void>(resolve => {
        const done = () => {
          clearTimeout(timer)
          signal.removeEventListener('abort', done)
          nudge = () => {}
          resolve()
        }
        const timer = setTimeout(done, ms)
        nudge = done
        signal.addEventListener('abort', done, { once: true })
      }),
  }
}

const listen = async (github: GitHub, pull: PullInput, signal: AbortSignal, heard: () => void) => {
  for await (const _ of github.changes(pull, signal)) heard()
}

const follow = (github: GitHub, pull: PullInput, context: KindContext, { pollMs, settleMs }: KindTimings) => {
  const stopped = new AbortController()
  const signal = AbortSignal.any([context.signal, stopped.signal])
  const { nudge, rest } = rests(signal)
  const from = `${pull.repo}#${pull.number}`

  const check = async () => {
    const before = seenOf(context.state)
    const snapshot = await readPull(github, pull, before?.since)
    const { seen, changes } = changesOf(from, before, snapshot, Date.now())
    context.save(seen)
    for (const change of changes) context.emit(change)
    return snapshot
  }

  const loop = async () => {
    let settling = false
    while (!signal.aborted) {
      const snapshot = await check().catch(error => void context.fail(error))
      if (snapshot?.status === 'merged') return stopped.abort()
      settling = !settling && snapshot?.status === 'open' && snapshot.conflict === undefined
      await rest(settling ? settleMs : pollMs)
    }
  }

  void listen(github, pull, signal, nudge).catch(() => {})
  void loop()
  return { stop: () => stopped.abort() }
}

export const pullKind = (github: GitHub, timings: KindTimings): Kind<typeof pullInput> => ({
  name: 'github-pull',
  label: 'GitHub pull request',
  description:
    'One pull request: its CI finishing (pass or fail), new reviews and comments, merging, closing and merge conflicts. Hears GitHub event streams where the account has them, and checks every minute otherwise; the first check only notes where things stand.',
  input: pullInput,
  describe: ({ repo, number }) => `${repo}#${number} on GitHub`,
  start: (pull, context) => (seenOf(context.state)?.status === 'merged' ? {} : follow(github, pull, context, timings)),
})
