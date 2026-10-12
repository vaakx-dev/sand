import type { ModelInfo } from '@sand/llm-accounts/contract'
import type { ModelMenuInput } from '@sand/model-picker/contract'
import { makeDefault } from './defaults'
import type { Page } from './page'

type Handlers = Pick<ModelMenuInput, 'toggleFavourite' | 'toggleHidden' | 'remove'>

export const settingsMenu = (page: Page, model: ModelInfo, handlers: Handlers) =>
  page.ctx.modelPicker.menu({ model, subtitle: page.sourceLabel(model), notify: page.ctx.notify, makeDefault: () => makeDefault(page, model), ...handlers })
