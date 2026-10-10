import type { ModelPicker } from './contract'
import { owned, pulse } from '@sand/dom'
import { definePlugin } from 'drydock'
import { pickerButton } from './button'
import type { PickerKit } from './kit'
import { modelMenu } from './model-menu'
import { modelPanel } from './panel/panel'
import { pcStatus } from './pcs'
import { resolve } from './resolve'

export default definePlugin({
  name: 'model-picker',
  description: 'The model picker: search, model sources, effort and fast mode in one panel, for the composer and settings',
  inject: ['models'],
  uses: {
    wire: 'no favourite, hide or make default actions, and models from another PC show no online dot',
    settings: 'no link to the Models settings page',
    notify: 'failed model actions are not reported',
  },
  apply(ctx) {
    const kit: PickerKit = {
      ctx,
      changes: pulse(ctx, ['models.change'], ['models']),
      pcs: owned(ctx, () => pcStatus(ctx)),
    }
    const picker: ModelPicker = {
      panel: (target, close, options) => modelPanel(kit, target, close, options),
      button: (target, label) => pickerButton(kit, target, label),
      resolve: settings => resolve(ctx, settings),
      online: pc => kit.pcs.online(pc),
      menu: modelMenu,
    }
    ctx.provide('modelPicker', picker)
  },
})
