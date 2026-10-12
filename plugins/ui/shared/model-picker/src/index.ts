import type { ModelPicker } from './contract'
import { owned, pulse } from '@sand/kit/web'
import { definePlugin } from 'drydock'
import { pickerButton } from './button'
import type { Picker } from './deps'
import { modelMenu } from './model-menu'
import { modelPanel } from './panel/panel'
import { pcStatus } from './pcs'
import { resolve } from './resolve'

export default definePlugin({
  name: 'model-picker',
  description: 'The model picker: search, model sources, effort and fast mode in one panel, for the composer and settings',
  inject: ['models', 'kit'],
  uses: {
    wire: 'no favourite, hide or make default actions, and models from another PC show no online dot',
    settings: 'no link to the Models settings page',
    notify: 'failed model actions are not reported',
    threads: 'Make default runs without the current folder',
  },
  apply(ctx) {
    const picker: Picker = {
      ctx,
      changes: pulse(ctx, ['models.change'], ['models']),
      pcs: owned(ctx, () => pcStatus(ctx)),
    }
    const service: ModelPicker = {
      panel: (target, close, options) => modelPanel(picker, target, close, options),
      button: (target, label) => pickerButton(picker, target, label),
      resolve: settings => resolve(ctx, settings),
      online: pc => picker.pcs.online(pc),
      menu: modelMenu,
    }
    ctx.provide('modelPicker', service)
  },
})
