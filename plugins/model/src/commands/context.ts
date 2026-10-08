import type { Context } from 'drydock'
import type { Choices } from '../choices'
import type { Defaults } from '../defaults'

export type ModelContext = Context<'ui' | 'sessions'>

export interface Tools {
  ctx: ModelContext
  choices: Choices
  defaults: Defaults
}
