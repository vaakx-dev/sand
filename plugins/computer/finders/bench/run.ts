import type { Finder } from '../src/contract'
import type { Sample } from './dataset'
import { outcomeOf, type Outcome } from './score'

export interface Variant {
  key: string
  model: string
  effort: string
  strategy: string
  needsElements: boolean
  finder: Finder
}

export interface Budget {
  cap: number
  spent: number
  stopped: boolean
}

const timeoutMs = 180_000

const attempt = async (variant: Variant, sample: Sample): Promise<Outcome> => {
  const base = { variant: variant.key, model: variant.model, effort: variant.effort, strategy: variant.strategy, sample: sample.id, source: sample.source, kind: sample.kind, bucket: sample.bucket }
  try {
    const located = await variant.finder.locate({ screenshot: sample.screenshot, target: sample.description, elements: sample.elements }, AbortSignal.timeout(timeoutMs))
    const { hit } = outcomeOf(located, sample.box, sample.elements)
    return { ...base, hit, ms: located.ms, inputTokens: located.usage.inputTokens, outputTokens: located.usage.outputTokens, costUsd: located.costUsd }
  } catch (error) {
    return { ...base, hit: false, ms: 0, inputTokens: 0, outputTokens: 0, costUsd: 0, error: error instanceof Error ? error.message : String(error) }
  }
}

export const runAll = async (variants: Variant[], samples: Sample[], budget: Budget, concurrency: number, progress: (outcome: Outcome) => void) => {
  const tasks = samples.flatMap(sample => variants.filter(variant => !variant.needsElements || sample.elements.length).map(variant => ({ variant, sample })))
  const outcomes: Outcome[] = []
  let next = 0
  const worker = async () => {
    while (next < tasks.length) {
      if (budget.spent >= budget.cap) {
        budget.stopped = true
        return
      }
      const { variant, sample } = tasks[next++]!
      const outcome = await attempt(variant, sample)
      budget.spent += outcome.costUsd
      outcomes.push(outcome)
      progress(outcome)
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker))
  return outcomes
}
