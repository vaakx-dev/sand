import type { Models } from '@sand/web-client/contract'
import type { ModelOf } from './runs'

export const modelsUnlike = (models: Models | undefined, parent: string): ModelOf => {
  const base = models?.settings(parent)?.model
  return thread => {
    const model = base && models?.settings(thread.id)?.model
    return model && model !== base ? (models?.info(model)?.label ?? model) : undefined
  }
}
