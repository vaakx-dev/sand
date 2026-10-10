import type { ModelInfo } from '@sand/llm-accounts/contract'
import type { ModelMenuInput } from '@sand/model-picker/contract'
import { makeDefault } from './defaults'
import type { Kit } from './kit'

type Handlers = Pick<ModelMenuInput, 'toggleFavourite' | 'toggleHidden' | 'remove'>

export const settingsMenu = (kit: Kit, model: ModelInfo, handlers: Handlers) =>
  kit.ctx.modelPicker.menu({ model, subtitle: kit.sourceLabel(model), notify: kit.ctx.notify, makeDefault: () => makeDefault(kit, model), ...handlers })
