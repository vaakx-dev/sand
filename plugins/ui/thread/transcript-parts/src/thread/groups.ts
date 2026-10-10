import type { Item, Report, Step, ToolGroup } from '../contract'
import { firstSentence } from '../tools/label'
import { field, resultText } from './results'

const startedInBackground = (input: unknown) => (input as { background?: unknown } | null | undefined)?.background === true

const reportOf = (step: Step): Report[] => {
  if (step.kind !== 'tool' || step.tool.call.name !== 'agent' || step.tool.status !== 'done') return []
  const { input } = step.tool.call
  const text = resultText(step.tool.result)
  if (!text || startedInBackground(input)) return []
  return [{ key: `report:${step.tool.call.id}`, name: field(input, 'agent') || 'general', label: field(input, 'label') || firstSentence(field(input, 'task')), text }]
}

const reportItems = (group: ToolGroup): Item[] => group.steps.flatMap(reportOf).map(report => ({ kind: 'report', key: report.key, report }))

export const groupAccumulator = (from?: ToolGroup) => {
  let group: ToolGroup | undefined = from && { ...from, steps: [...from.steps] }
  return {
    get open() {
      return group !== undefined
    },
    get current() {
      return group
    },
    add(step: Step, start: number, at: number) {
      group ??= { kind: 'tools', key: `g:${step.key}`, steps: [], start, end: at, running: false }
      group.steps.push(step)
      group.end = Math.max(group.end, at)
    },
    touch(at: number) {
      if (group) group.end = Math.max(group.end, at)
    },
    take(running = false): Item[] {
      if (!group) return []
      const done = { ...group, running }
      group = undefined
      return [done, ...reportItems(done)]
    },
  }
}
