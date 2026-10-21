import type { Item, Step, ToolGroup } from '../contract'

export const itemCollector = (from?: ToolGroup) => {
  const items: Item[] = []
  let group: ToolGroup | undefined = from && { ...from, steps: [...from.steps] }

  const extend = (at: number) => {
    if (group) group.end = Math.max(group.end, at)
  }

  const close = (running = false) => {
    if (!group) return
    items.push({ ...group, running })
    group = undefined
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
