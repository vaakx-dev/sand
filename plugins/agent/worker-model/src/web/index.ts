import type { SessionSettings, SettingsPatch } from '@sand/model/contract'
import type { ModelPicker } from '@sand/model-picker/contract'
import { errorMessage } from '@sand/kit'
import { sig } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import type {} from '../contract'
import { workerSection } from './section'

export default definePlugin({
  name: 'worker-model-web',
  description: 'Workers section on the Models settings page: pick the worker model',
  inject: ['wire', 'kit'],
  uses: {
    settings: 'no Workers section',
    modelPicker: 'no worker model picker',
    notify: 'failed saves are not reported',
  },
  apply(ctx) {
    const state = sig<SessionSettings | undefined>(undefined)
    const picker = sig<ModelPicker | undefined>(undefined)
    const fail = (error: unknown) => ctx.notify?.push(errorMessage(error), { level: 'error' })
    const load = () =>
      ctx.wire.call<SessionSettings>({ type: 'workerModel.get' }).then(
        value => state.set(value),
        () => state.set(undefined),
      )
    const save = (patch: SettingsPatch) => ctx.wire.call<SessionSettings>({ type: 'workerModel.save', ...patch }).then(value => state.set(value), fail)

    ctx.on('wire.hello', () => void load())
    if (ctx.wire.state() === 'open') void load()
    ctx.on('wire.event', event => {
      if (event.name === 'workerModel.change') state.set(event.args[0])
    })
    ctx.watch('modelPicker', value => picker.set(value))
    ctx.watch('settings', settings => settings?.section({ page: 'models', id: 'worker-model', order: 11, render: () => workerSection(ctx.kit, state, picker, save) }))
  },
})
