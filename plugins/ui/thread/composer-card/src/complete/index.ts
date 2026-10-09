import type { CompletionSource } from '../contract'
import { listen, type Child } from '@sand/dom'
import { completionModel, type Field } from './model'
import { completionKeys, completionView } from './view'

export interface Completion {
  view: Child[]
  open(): boolean
  keydown(event: KeyboardEvent): boolean
  refresh(): void
  close(): void
}

export const createCompletion = (input: Field, sources: () => CompletionSource[], submit: () => void): Completion => {
  const model = completionModel(input, sources, submit)
  listen(input, 'input', model.update)
  listen(input, 'click', model.update)
  listen(input, 'blur', model.close)
  return {
    view: completionView(model),
    open: () => model.visible.get(),
    refresh: () => {
      if (document.activeElement === input) model.update()
    },
    close: model.close,
    keydown: event => completionKeys(model, event),
  }
}
