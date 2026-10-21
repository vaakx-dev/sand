import type { Models, Thread } from '@sand/web-client/contract'

export type ModelOf = (thread: Thread) => string | undefined

export const modelsUnlike = (models: Models | undefined, parent: string): ModelOf => {
  const base = models?.settings(parent)?.model
  return thread => {
    const model = base && models?.settings(thread.id)?.model
    return model && model !== base ? (models?.info(model)?.label ?? model) : undefined
  }
}
