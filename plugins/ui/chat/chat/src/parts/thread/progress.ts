import type { Step, ToolGroup } from '../contract'
import type { Settled } from './settled'

type Logs = Map<string, string[]>

const logOf = (step: Step, logs: Logs) => (step.kind === 'tool' ? logs.get(step.tool.call.id) : undefined)

const withLog = (step: Step, logs: Logs): Step => {
  const progress = logOf(step, logs)
  return progress && step.kind === 'tool' ? { ...step, tool: { ...step.tool, progress } } : step
}

const groupWithLogs = (group: ToolGroup, logs: Logs): ToolGroup =>
  group.steps.some(step => logOf(step, logs)) ? { ...group, steps: group.steps.map(step => withLog(step, logs)) } : group

export const withProgress = (settled: Settled, logs: Logs): Settled => {
  if (!logs.size) return settled
  return {
    ...settled,
    items: settled.items.map(item => (item.kind === 'tools' ? groupWithLogs(item, logs) : item)),
    group: settled.group && groupWithLogs(settled.group, logs),
  }
}
