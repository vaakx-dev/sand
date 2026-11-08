import { wireHello } from '@sand/devices-contract'
import { modelDefaults } from '@sand/model-panel/contract'
import { sig } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { helloSubModel, subModelChange } from '../contract'
import { inject } from './context'
import { modelRow } from './model'

export default definePlugin({
  name: 'sub-model-web',
  description: 'The Sub model row on Settings › Models',
  inject,
  apply(ctx) {
    const state = sig(ctx.wire.hello(helloSubModel))
    ctx.on(wireHello, () => state.set(ctx.wire.hello(helloSubModel)))
    ctx.effect(() => ctx.wire.on(subModelChange, next => state.set(next)))
    const rows = { ctx, state }
    ctx.watch(modelDefaults, defaults => defaults?.slot(() => modelRow(rows)))
  },
})
