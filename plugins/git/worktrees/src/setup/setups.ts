import type { ShellRunner } from '@sand/shell/contract'
import { errorMessage } from '@sand/util'
import type { WorktreeSetup } from '../contract'
import { pathKey } from '../records/key'
import type { PlannedStep, WorktreeRecord } from '../records/schema'
import type { RecordStore } from '../records/store'
import { runCommand } from './command'
import { copyEntry } from './copy'
import type { StepOutcome } from './outcome'
import { configStep, planSteps } from './plan'
import { settle, shownSetup } from './state'
import { createWaiters } from './waiters'

const outputEveryMs = 300

export interface SetupDeps {
  store: RecordStore
  shell(): ShellRunner | undefined
  send(setup: WorktreeSetup): void
  report(error: unknown): void
}

interface Active {
  controller: AbortController
  done: Promise<void>
}

export type Setups = ReturnType<typeof createSetups>

export const createSetups = ({ store, shell, send, report }: SetupDeps) => {
  const active = new Map<string, Active>()
  const pending = new Map<string, ReturnType<typeof setTimeout>>()
  const waiters = createWaiters()

  const publish = (record: WorktreeRecord) => {
    if (record.setup) send(shownSetup(record.setup))
  }

  const publishSoon = (record: WorktreeRecord) => {
    const key = pathKey(record.path)
    if (pending.has(key)) return
    pending.set(
      key,
      setTimeout(() => {
        pending.delete(key)
        publish(record)
      }, outputEveryMs),
    )
  }

  const changed = async (record: WorktreeRecord) => {
    const setup = record.setup
    if (!setup) return
    settle(setup)
    clearTimeout(pending.get(pathKey(record.path)))
    pending.delete(pathKey(record.path))
    await store.save().catch(report)
    publish(record)
    if (setup.done) waiters.wake(pathKey(record.path))
  }

  const perform = async (record: WorktreeRecord, step: PlannedStep, signal: AbortSignal): Promise<StepOutcome> => {
    if (step.copy !== undefined) return copyEntry(record.main, record.path, step.copy)
    if (step.run === undefined) return { state: 'ok' }
    return runCommand(shell(), record.path, step.run, signal, tail => {
      step.output = tail
      publishSoon(record)
    })
  }

  const runStep = async (record: WorktreeRecord, step: PlannedStep, signal: AbortSignal) => {
    step.state = 'run'
    delete step.output
    await changed(record)
    const outcome = await perform(record, step, signal).catch((error): StepOutcome => ({ state: 'fail', output: errorMessage(error) }))
    step.state = outcome.state
    if (outcome.output) step.output = outcome.output
    else delete step.output
    await changed(record)
    return outcome.state
  }

  const runRest = async (record: WorktreeRecord, signal: AbortSignal) => {
    for (const step of record.setup?.steps ?? []) {
      if (step.state === 'ok' || step.state === 'skip') continue
      if (signal.aborted || step.state === 'fail') return
      if ((await runStep(record, step, signal)) === 'fail') return
    }
  }

  const begin = (record: WorktreeRecord) => {
    const key = pathKey(record.path)
    if (active.has(key)) return
    const controller = new AbortController()
    const done = runRest(record, controller.signal)
      .catch(report)
      .finally(() => active.delete(key))
    active.set(key, { controller, done })
  }

  const stop = async (key: string) => {
    const running = active.get(key)
    if (!running) return
    running.controller.abort()
    await running.done
  }

  const state = (path: string) => {
    const setup = store.get(path)?.setup
    return setup ? shownSetup(setup) : null
  }

  const retry = async (record: WorktreeRecord) => {
    const setup = record.setup
    const failed = setup?.steps.findIndex(step => step.state === 'fail') ?? -1
    const step = setup?.steps[failed]
    if (!setup || !step || active.has(pathKey(record.path))) return
    if (step.id === configStep) setup.steps.splice(failed, setup.steps.length - failed, ...(await planSteps(record.main)))
    else {
      step.state = 'wait'
      delete step.output
    }
    await changed(record)
    begin(record)
  }

  const skip = async (record: WorktreeRecord) => {
    if (!record.setup) return
    await stop(pathKey(record.path))
    for (const step of record.setup.steps) if (step.state !== 'ok') step.state = 'skip'
    await changed(record)
  }

  return {
    async start(record: WorktreeRecord) {
      await changed(record)
      begin(record)
    },
    state,
    async request(path: string, { retry: again, skip: rest }: { retry?: boolean; skip?: boolean }) {
      await store.ready()
      const record = store.containing(path)
      if (!record) return null
      if (rest) await skip(record)
      else if (again) await retry(record)
      return state(record.path)
    },
    async ready(cwd: string, signal: AbortSignal) {
      await store.ready()
      const record = store.containing(cwd)
      if (!record?.setup || record.setup.done) return
      await waiters.wait(pathKey(record.path), signal)
    },
    async forget(path: string) {
      await stop(pathKey(path))
      waiters.wake(pathKey(path))
    },
    close() {
      for (const running of active.values()) running.controller.abort()
      for (const timer of pending.values()) clearTimeout(timer)
      pending.clear()
      waiters.wakeAll()
    },
  }
}
