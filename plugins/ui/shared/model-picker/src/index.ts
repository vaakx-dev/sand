import { models, modelsChange } from '@sand/web-client/contract'
import { owned, pulse } from '@sand/web-client/reactive'
import { definePlugin } from 'drydock'
import { pickerButton } from './button'
import { modelPicker, type ModelPicker } from './contract'
import { inject, type Picker } from './deps'
import { modelMenu } from './model-menu'
import { modelPanel } from './panel/panel'
import { pcStatus } from './pcs'
import { resolve } from './resolve'

export default definePlugin({
  name: 'model-picker',
  description: 'The model picker: search, model sources, effort and fast mode in one panel, for the composer and settings',
  inject,
  apply(ctx) {
    const picker: Picker = {
      ctx,
      changes: pulse(ctx, [modelsChange], [models]),
      pcs: owned(ctx, () => pcStatus(ctx)),
    }
    const service: ModelPicker = {
      panel: (target, close, options) => modelPanel(picker, target, close, options),
      button: (target, label) => pickerButton(picker, target, label),
      resolve: settings => resolve(ctx, settings),
      online: pc => picker.pcs.online(pc),
      menu: input => modelMenu(ctx.kit, input),
    }
    ctx.provide(modelPicker, service)
  },
})
