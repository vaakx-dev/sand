import { wireHello } from '@sand/devices-contract'
import { modelDefaults } from '@sand/model-panel/contract'
import { div, sig } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { helloSubModel, subModelChange } from '../contract'
import { inject } from './context'
import { modelRow } from './model'
import { jobRows } from './skills'

export default definePlugin({
  name: 'sub-model-web',
  description: 'The Sub model row on Settings › Models, with a skill picker for each background job under it',
  inject,
  apply(ctx) {
    const state = sig(ctx.wire.hello(helloSubModel))
    ctx.on(wireHello, () => state.set(ctx.wire.hello(helloSubModel)))
    ctx.effect(() => ctx.wire.on(subModelChange, next => state.set(next)))
    const rows = { ctx, state }
    ctx.watch(modelDefaults, defaults => defaults?.slot(() => div({ class: 'contents' }, modelRow(rows), jobRows(rows))))
  },
})
