import type { SetupStep, WorktreeSetup } from '../contract'
import type { PlannedStep, StoredSetup } from '../records/schema'

const finished = (step: PlannedStep) => step.state === 'ok' || step.state === 'skip'

export const settle = (setup: StoredSetup) => {
  setup.failed = setup.steps.some(step => step.state === 'fail')
  setup.done = setup.steps.every(finished)
}

export const freshSetup = (path: string, steps: PlannedStep[]): StoredSetup => ({ path, steps, done: false, failed: false })

export const doneStep = (id: string, label: string, output?: string): PlannedStep => ({ id, label, state: 'ok', ...(output ? { output } : {}) })

const shownStep = ({ id, label, state, output }: PlannedStep): SetupStep => ({ id, label, state, ...(output !== undefined ? { output } : {}) })

export const shownSetup = ({ path, session, steps, done, failed }: StoredSetup): WorktreeSetup => ({
  path,
  ...(session ? { session } : {}),
  steps: steps.map(shownStep),
  done,
  failed,
})

export const reviveSetup = (setup: StoredSetup) => {
  const stopped = setup.steps.find(step => step.state === 'run' || step.state === 'wait')
  if (stopped && !setup.steps.some(step => step.state === 'fail')) {
    stopped.state = 'fail'
    stopped.output = [stopped.output, 'Stopped when sand restarted.'].filter(Boolean).join('\n')
  }
  settle(setup)
}
