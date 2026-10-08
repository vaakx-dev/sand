import { stored, untrack } from '@sand/dom'
import { migratedKey, type ProjectChoice } from './project-choices'

export const projectFilter = () => {
  const project = stored('sand.sidebar-cards.project', '')
  return {
    project,
    set: (next: string | undefined) => project.set(next ?? ''),
    migrate(choices: ProjectChoice[]) {
      const current = untrack(() => project.get())
      const next = migratedKey(choices, current)
      if (next !== current) project.set(next)
    },
  }
}
