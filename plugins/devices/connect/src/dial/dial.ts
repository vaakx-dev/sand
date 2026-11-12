import type { Attempt, BlockReason, Route } from '@sand/devices-contract'
import { errorMessage } from '@sand/util'
import { resumeOf } from '../engine/hello'
import { AccessRefused } from '../errors/access-refused'
import { attemptResultOf } from './classify'
import type { DialContext, DialRun } from './context'
import { type Opened, openRoute } from './open'
import { passedAsTheyCome } from './passed'
import { type Probe, probeRoute } from './probe'
import { type Resumable, resumable, resumeRoute } from './resume'
import { signClaim } from './socket'

export interface Blocked {
  reason: BlockReason
  at?: number
  by?: string
}

export type DialOutcome = { ok: true; opened: Opened } | { ok: false; cause: string; blocked?: Blocked }

type Recorder = (attempt: Attempt) => void

const resumeHeadStart = 1500

interface Resuming {
  route: Route
  opened: Promise<Opened | undefined>
}

const blockedBy = (error: unknown): Blocked | undefined => {
  if (!(error instanceof AccessRefused)) return undefined
  const { reason, at, by } = error.refusal
  if (reason === 'removed') return { reason: 'removed', ...(at !== undefined && { at }), ...(by !== undefined && { by }) }
  if (reason === 'unknown') return { reason: 'not-paired' }
  return undefined
}

const allWrongPc = (probes: Probe[]) => probes.length > 0 && probes.every(probe => !probe.ok && probe.result === 'wrong-pc')

const probeAndOpen = async (routes: Route[], context: DialContext, run: DialRun, record: Recorder, resuming?: Resuming): Promise<DialOutcome> => {
  const expected = context.expected()
  let cause = 'no route answered'
  const probes = routes.map(route =>
    probeRoute(route, context.transportOf, expected, context.signer).then(probe => {
      if (!probe.ok) {
        cause = probe.error
        record({ route, result: probe.result, at: Date.now(), ms: probe.ms, error: probe.error })
      }
      return probe
    }),
  )

  for await (const probe of passedAsTheyCome(probes)) {
    if (probe.route.key === resuming?.route.key) await resuming.opened
    if (run.stopped) return { ok: false, cause: 'stopped' }
    context.identified(probe.identity)
    const started = Date.now()
    try {
      const opened = await openRoute(probe, context, run)
      if (run.stopped) {
        opened.link.close()
        return { ok: false, cause: 'stopped' }
      }
      record({ route: probe.route, result: 'ok', at: Date.now(), ms: probe.ms })
      return { ok: true, opened }
    } catch (error) {
      cause = errorMessage(error)
      record({ route: probe.route, result: attemptResultOf(error), at: Date.now(), ms: Date.now() - started, error: cause })
      const blocked = blockedBy(error)
      if (blocked) return { ok: false, cause, blocked }
    }
  }

  const settled = await Promise.all(probes)
  return allWrongPc(settled) ? { ok: false, cause, blocked: { reason: 'wrong-pc' } } : { ok: false, cause }
}

const failedOrSlow = (opened: Promise<Opened | undefined>) =>
  new Promise<void>(resolve => {
    const head = setTimeout(resolve, resumeHeadStart)
    void opened.then(found => {
      if (found) clearTimeout(head)
      else resolve()
    })
  })

const tagged = <K extends string, T>(kind: K, promise: Promise<T>) => promise.then(value => ({ kind, value }))

const firstOpened = async (resume: Resumable | undefined, routes: Route[], context: DialContext, run: DialRun, record: Recorder): Promise<DialOutcome> => {
  if (!resume) return probeAndOpen(routes, context, run, record)
  let resumed = false
  const opened = resumeRoute(resume, context, run).then(found => {
    resumed = found !== undefined
    return found
  })
  const probeRun: DialRun = { greeting: run.greeting, get stopped() { return run.stopped || resumed } }
  const probing = failedOrSlow(opened).then(() => probeAndOpen(routes, context, probeRun, record, { route: resume.route, opened }))
  const first = await Promise.race([tagged('resume', opened), tagged('probe', probing)])
  if (first.kind === 'resume' && first.value) {
    record({ route: resume.route, result: 'ok', at: Date.now(), ms: first.value.ms })
    return { ok: true, opened: first.value }
  }
  if (first.kind === 'resume') return probing
  if (first.value.ok) {
    void opened.then(late => late?.link.close())
    return first.value
  }
  const late = await opened
  if (!late) return first.value
  record({ route: resume.route, result: 'ok', at: Date.now(), ms: late.ms })
  return { ok: true, opened: late }
}

const remember = async (context: DialContext, { route, hello }: Opened) => {
  const resume = resumeOf(hello)
  if (!resume || route.via !== undefined) return
  const pc = context.expected().id
  const { signature } = await signClaim(context.signer, pc, resume.nonce)
  context.resume.save(pc, { ...resume, route: route.key, signature })
}

export const dial = async (routes: Route[], context: DialContext, run: DialRun, record: Recorder): Promise<DialOutcome> => {
  const outcome = await firstOpened(resumable(routes, context), routes, context, run, record)
  if (outcome.ok) await remember(context, outcome.opened).catch(() => {})
  return outcome
}
