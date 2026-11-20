import { duration, errorMessage, untilAborted } from '@sand/util'
import type { Check, CheckOutcome } from './read'

const mostFailures = 6

export interface Timing {
  intervalMs: number
  graceMs: number
}

export const timing: Timing = { intervalMs: 10_000, graceMs: 60_000 }

export interface Watch {
  read(): Promise<Check[]>
  explain(failed: Check): Promise<string[]>
  settled(outcome: CheckOutcome): void
  progress(text: string): void
  signal: AbortSignal
  spoke: AbortSignal
  timeoutMs: number
  timing: Timing
}

const names = (checks: Check[]) => [...new Set(checks.map(check => check.name))].join(', ')

const summary = (checks: Check[]) => {
  if (!checks.length) return 'no checks reported yet'
  const running = checks.filter(check => check.state === 'running')
  const done = `${checks.length - running.length} of ${checks.length} done`
  return running.length ? `${done}, running: ${names(running)}` : done
}

const report = async (check: Check, explain: Watch['explain']) => [`- ${check.name}: ${check.url}`, ...(await explain(check)).map(line => `  ${line}`)]

const failure = async (failed: Check[], checks: Check[], explain: Watch['explain']) => {
  const reports = await Promise.all(failed.map(check => report(check, explain)))
  return [`${failed.length} failed (${summary(checks)}):`, ...reports.flat()].join('\n')
}

export const outcomeOf = (checks: Check[]): CheckOutcome | undefined => {
  if (checks.some(check => check.state === 'failed')) return 'failed'
  if (checks.length && checks.every(check => check.state === 'passed')) return 'passed'
  return undefined
}

const verdict = async (checks: Check[], waited: number, { timing, explain }: Watch) => {
  const outcome = outcomeOf(checks)
  if (outcome === 'failed') return failure(checks.filter(check => check.state === 'failed'), checks, explain)
  if (outcome === 'passed') return `all ${checks.length} passed: ${names(checks)}.`
  if (!checks.length && waited >= timing.graceMs) return `no checks reported within ${duration(timing.graceMs)}; the repo may run none for it.`
  return undefined
}

export const waitChecks = async (watch: Watch) => {
  const { read, settled, progress, signal, spoke, timeoutMs, timing } = watch
  const started = Date.now()
  const stop = AbortSignal.any([signal, spoke])
  let checks: Check[] = []
  let failures: string[] = []
  for (;;) {
    try {
      checks = await read()
      failures = []
    } catch (error) {
      failures.push(errorMessage(error))
    }
    const waited = Date.now() - started
    const last = failures.at(-1)
    if (failures.length >= mostFailures) throw new Error(`Reading the checks failed ${failures.length} times in a row, last with: ${last} Last seen: ${summary(checks)}.`)
    const done = last === undefined ? await verdict(checks, waited, watch) : undefined
    const outcome = outcomeOf(checks)
    if (done && outcome) settled(outcome)
    if (done) return done
    const status = last === undefined ? summary(checks) : `${summary(checks)}; retrying after: ${last}`
    if (waited >= timeoutMs) return `timed out after ${duration(timeoutMs)}: ${status}`
    progress(status)
    await untilAborted(Bun.sleep(Math.min(timing.intervalMs, timeoutMs - waited)), stop).catch(() => {})
    signal.throwIfAborted()
    if (spoke.aborted) return `the user sent a message: ${status}`
  }
}
