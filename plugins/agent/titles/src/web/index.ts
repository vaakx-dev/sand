import type { TitlePatch, TitleSettings } from '../contract'
import { errorMessage, pulse, sig } from '@sand/dom'
import { definePlugin } from 'drydock'
import { titlesSection } from './section'

export default definePlugin({
  name: 'titles-web',
  description: 'Thread names section on the Models settings page: turn automatic naming on or off and pick the naming model',
  inject: ['wire'],
  uses: {
    settings: 'no Thread names section',
    models: 'the naming model menu only shows the chosen model',
    notify: 'failed saves are not reported',
  },
  apply(ctx) {
    const state = sig<TitleSettings | undefined>(undefined)
    const models = pulse(ctx, ['models.change'], ['models']).read(() => ctx.models?.list() ?? [])
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
    ctx.watch('settings', settings => settings?.section({ page: 'models', id: 'titles', order: 10, render: () => titlesSection(state, models, save) }))
  },
})
