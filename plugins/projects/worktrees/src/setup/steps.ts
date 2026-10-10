import type { SetupStep, WorktreeProgress } from '../contract'
import { errorMessage } from '@sand/kit'

export interface Step {
  label: string
  run(): Promise<string | void>
}

export type Publish = (progress: WorktreeProgress) => void

export interface StepsOutcome {
  failed?: number
  error?: string
}

export const finalLabel = 'Continue the thread'

export const runSteps = async (session: string, steps: Step[], publish: Publish): Promise<StepsOutcome> => {
  const view: SetupStep[] = [...steps.map(step => ({ label: step.label, state: 'wait' as const })), { label: finalLabel, state: 'wait' }]
  const send = (done: boolean, error?: string) => publish({ session, steps: view.map(step => ({ ...step })), done, ...(error && { error }) })
  for (const [index, step] of steps.entries()) {
    const started = Date.now()
    view[index] = { ...view[index]!, state: 'run', started }
    send(false)
    try {
      const label = await step.run()
      view[index] = { label: label || step.label, state: 'ok', started, ms: Date.now() - started }
    } catch (error) {
      view[index] = { ...view[index]!, state: 'fail', ms: Date.now() - started }
      send(true, errorMessage(error))
      return { failed: index, error: errorMessage(error) }
    }
  }
  view[steps.length] = { label: finalLabel, state: 'ok' }
  send(true)
  return {}
}
