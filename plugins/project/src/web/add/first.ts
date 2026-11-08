import type { Kit } from '@sand/ui-kit/contract'
import { type Derive, effect, untrack } from '@vaakx-dev/vrui'

export const firstProject = ({ primaryAction, setupHeading, setupNote, setupScreen }: Kit, count: Derive<number>, add: () => void, next: () => void) => {
  const before = count.get()
  effect(() => {
    if (count.get() > before) untrack(next)
  })
  return setupScreen(setupHeading('Add your first project'), setupNote('A folder your threads work in.'), primaryAction({ onClick: add }, 'Add a project'))
}
