import type { ModelPicker } from '@sand/model-picker/contract'
import type { TitlePatch, TitleSettings } from '../contract'
import { errorMessage } from '@sand/kit'
import { sig } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { titlesSection } from './section'

export default definePlugin({
  name: 'titles-web',
  description: 'Text generation section on the Models settings page: turn automatic naming on or off and pick the text gen model',
  inject: ['wire', 'kit'],
  uses: {
    settings: 'no Text generation section',
    modelPicker: 'no text gen model picker',
    notify: 'failed saves are not reported',
  },
  apply(ctx) {
    const state = sig<TitleSettings | undefined>(undefined)
    const picker = sig<ModelPicker | undefined>(undefined)
    const fail = (error: unknown) => ctx.notify?.push(errorMessage(error), { level: 'error' })
    const load = () =>
      ctx.wire.call<TitleSettings>({ type: 'titles.get' }).then(
        value => state.set(value),
        () => state.set(undefined),
      )
    const save = (patch: TitlePatch) => ctx.wire.call<TitleSettings>({ type: 'titles.save', ...patch }).then(value => state.set(value), fail)

    ctx.on('wire.hello', () => void load())
    if (ctx.wire.state() === 'open') void load()
    ctx.on('wire.event', event => {
      if (event.name === 'titles.change') state.set(event.args[0])
    })
    ctx.watch('modelPicker', value => picker.set(value))
    ctx.watch('settings', settings => settings?.section({ page: 'models', id: 'titles', order: 10, render: () => titlesSection(ctx.kit, state, picker, save) }))
  },
})
