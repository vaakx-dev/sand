import { errorMessage } from '@sand/util'
import { sig } from '@vaakx-dev/vrui'
import type { AsideRun } from '../contract'
import { createHandoff } from '../handoff'
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
    const content = found && (await createHandoff(model, () => {}).snapshot())
    if (!found || !content) return
    try {
      await found({ ...content, chat: model.target.name() })
      model.clear()
    } catch (error) {
      model.fail(errorMessage(error))
    }
  }
  return { add, ready, run }
}

export type Asides = ReturnType<typeof createAsides>
