import type { Asked } from '@sand/model/contract'
import { errorMessage } from '@sand/util'
import type { OrchestratorContext } from './context'
import { failure } from './contract'

export const matchSettings = (ctx: OrchestratorContext, { model, effort, speed }: Asked, near?: string) => {
  try {
    return ctx.modelSettings.match({ model, effort, speed }, near)
  } catch (error) {
    throw failure('invalid_request', errorMessage(error))
  }
}
