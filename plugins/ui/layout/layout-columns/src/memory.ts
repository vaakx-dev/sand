import { stored } from '@sand/dom'
import type { Open } from './shell'

export const layoutMemory = () => {
  const saved = stored<Partial<Open>>('sand.layout.open', {})
  return {
    remembered: (): Open => ({ side: saved.get().side ?? true, aside: false }),
    remember: (open: Open) => saved.set(open),
  }
}
