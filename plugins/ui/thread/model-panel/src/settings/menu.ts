import type { ModelInfo } from '@sand/llm-accounts/contract'
import { modelMenu, type ModelMenuInput } from '../model-menu'
import { makeDefault } from './defaults'
import type { Kit } from './kit'

type Handlers = Pick<ModelMenuInput, 'toggleFavourite' | 'toggleHidden' | 'remove'>

export const settingsMenu = (kit: Kit, model: ModelInfo, handlers: Handlers) =>
  modelMenu({ model, subtitle: kit.sourceLabel(model), notify: kit.ctx.notify, makeDefault: () => makeDefault(kit, model), ...handlers })
