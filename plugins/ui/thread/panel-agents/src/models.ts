import type { Models } from '@sand/protocol'
import type { ModelOf } from './rows'

export const modelsUnlike = (models: Models | undefined, parent: string): ModelOf => {
  const base = models?.settings(parent)?.model
  return thread => {
    const model = base && models?.settings(thread.id)?.model
    return model && model !== base ? (models?.info(model)?.label ?? model) : undefined
  }
}
