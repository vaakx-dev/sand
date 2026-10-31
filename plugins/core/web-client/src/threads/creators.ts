import type { Dispose } from 'drydock'
import type { DraftTarget, ThreadCreator } from '../contract'

export const threadCreators = () => {
  const creators: ThreadCreator[] = []

  const add = (make: ThreadCreator): Dispose => {
    creators.unshift(make)
    return () => {
      const index = creators.indexOf(make)
      if (index >= 0) creators.splice(index, 1)
    }
  }

  const claim = (target: DraftTarget) => {
    for (const make of creators) {
      const made = make(target)
      if (made) return made
    }
    return undefined
  }

  return { add, claim }
}
