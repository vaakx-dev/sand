import type { Item, Report, Step, ToolGroup } from '../contract'
import { firstSentence } from '../tools/label'
import { field, resultText } from './results'

const startedInBackground = (input: unknown) => field(input, 'background') === 'true'

const reportOf = (step: Step): Report[] => {
  if (step.kind !== 'tool' || step.tool.call.name !== 'agent' || step.tool.status !== 'done') return []
  const { input } = step.tool.call
  const text = resultText(step.tool.result)
  if (!text || startedInBackground(input)) return []
  return [{ key: `report:${step.tool.call.id}`, name: field(input, 'agent') || 'general', label: field(input, 'label') || firstSentence(field(input, 'task')), text }]
}

const reportItems = (group: ToolGroup): Item[] => group.steps.flatMap(reportOf).map(report => ({ kind: 'report', key: report.key, report }))

export const itemCollector = (from?: ToolGroup) => {
  const items: Item[] = []
  let group: ToolGroup | undefined = from && { ...from, steps: [...from.steps] }

  const extend = (at: number) => {
    if (group) group.end = Math.max(group.end, at)
  }

  const close = (running = false) => {
    if (!group) return
    const done = { ...group, running }
    group = undefined
    items.push(done, ...reportItems(done))
  }

  return {
    items,
    get group() {
      return group
    },
    extend,
    close,
    emit(...next: Item[]) {
      close()
      items.push(...next)
    },
    step(step: Step, start: number, at: number) {
      group ??= { kind: 'tools', key: `g:${step.key}`, steps: [], start, end: at, running: false }
      group.steps.push(step)
      extend(at)
    },
    thinking(key: string, text: string, streaming: boolean, at: number) {
      if (!group) return void items.push({ kind: 'thinking', key, text, streaming, at })
      group.steps.push({ kind: 'thinking', key, text, streaming })
      extend(at)
    },
  }
}
