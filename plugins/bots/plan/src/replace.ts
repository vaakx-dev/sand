import { failure } from '@sand/orchestrator/contract'
import type { PlanReplacement } from './contract'

const problem = (plan: string, { old_string }: PlanReplacement) => {
  const count = plan.split(old_string).length - 1
  if (count === 0) return 'old_string is not in the plan'
  if (count > 1) return `old_string matches ${count} times in the plan; add context`
}

const replaceOne = (plan: string, replacement: PlanReplacement, index: number, all: PlanReplacement[]) => {
  const error = problem(plan, replacement)
  if (!error) return plan.replace(replacement.old_string, () => replacement.new_string)
  const which = all.length > 1 ? `Edit ${index + 1} of ${all.length}: ` : ''
  throw failure('invalid_request', `${which}${error}. The plan was not changed.`)
}

const replaced = (plan: string, edits: PlanReplacement[]) => edits.reduce(replaceOne, plan)

export { replaced }
