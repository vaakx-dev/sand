import type { CheckItem, CheckItemState } from '../../contract'
import { failedStates } from './checks'
import type { CheckCounts, CheckNode, CheckRunNode, StatusContextNode } from './query'

const most = 30
const skipped = new Set(['SKIPPED', 'NEUTRAL', 'STALE'])
const order: Record<CheckItemState, number> = { fail: 0, pending: 1, pass: 2, skip: 3 }

const runState = (node: CheckRunNode): CheckItemState => {
  if (node.status !== 'COMPLETED' || !node.conclusion) return 'pending'
  if (failedStates.has(node.conclusion)) return 'fail'
  return skipped.has(node.conclusion) ? 'skip' : 'pass'
}

const contextState = (node: StatusContextNode): CheckItemState => {
  if (failedStates.has(node.state)) return 'fail'
  return node.state === 'SUCCESS' ? 'pass' : 'pending'
}

const secondsBetween = (start: string | null, end: string | null) => {
  if (!start || !end) return undefined
  const seconds = Math.round((Date.parse(end) - Date.parse(start)) / 1000)
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : undefined
}

const runItem = (node: CheckRunNode): CheckItem => {
  const workflow = node.checkSuite?.workflowRun?.workflow?.name
  const seconds = secondsBetween(node.startedAt, node.completedAt)
  return {
    name: workflow ? `${workflow} / ${node.name}` : node.name,
    state: runState(node),
    ...(node.detailsUrl ? { url: node.detailsUrl } : {}),
    ...(seconds === undefined ? {} : { seconds }),
  }
}

const contextItem = (node: StatusContextNode): CheckItem => ({
  name: node.context,
  state: contextState(node),
  ...(node.targetUrl ? { url: node.targetUrl } : {}),
})

const itemOf = (node: CheckNode | null) => {
  if (node?.__typename === 'CheckRun') return runItem(node)
  if (node?.__typename === 'StatusContext') return contextItem(node)
  return undefined
}

export const listChecks = (counts: CheckCounts | undefined): CheckItem[] =>
  (counts?.nodes ?? [])
    .map(itemOf)
    .filter((item): item is CheckItem => item !== undefined)
    .sort((a, b) => order[a.state] - order[b.state])
    .slice(0, most)
