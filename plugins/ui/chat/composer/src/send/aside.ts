import { errorMessage } from '@sand/util'
import { sig } from '@vaakx-dev/vrui'
import type { AsideRun } from '../contract'
import type { Model } from '../model'

export const createAsides = () => {
  const latest = sig<AsideRun[]>([])
  const add = (run: AsideRun) => {
    latest.update(list => [...list, run])
    return () => latest.update(list => list.filter(other => other !== run))
  }
  const ready = () => latest.get().length > 0
  const run = async (model: Model) => {
    const found = latest.get().at(-1)
    if (!found || model.empty.get()) return
    const draft = model.draft()
    model.clear()
    try {
      await found({ ...(await model.content(draft)), chat: model.target.name() })
    } catch (error) {
      model.putBack(draft, errorMessage(error))
    }
  }
  return { add, ready, run }
}

export type Asides = ReturnType<typeof createAsides>
