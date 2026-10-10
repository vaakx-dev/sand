import { errorMessage, owned, pulse, sig } from '@sand/dom'
import { definePlugin } from 'drydock'
import { createActions, serverCommand } from './actions'
import { modelSource } from './palette'
import { pcStatus } from './pcs'
import { createPicker } from './pill'
import { modelsPage } from './settings'

export default definePlugin({
  name: 'model-panel',
  description: 'One pill for model, effort and fast mode; it opens one panel. Also adds palette rows.',
  inject: ['models', 'threads'],
  uses: {
    composer: 'no pill; /model and /effort open the server sheet',
    palette: 'no model rows in the palette',
    commands: '/model and /effort with no argument open the server sheet',
    notify: 'problems show inside the panel',
    settings: 'no Models settings page',
    wire: 'models from another PC show no online dot and stay enabled when it is offline',
  },
  apply(ctx) {
    const problem = sig('')
    const fail = (text: string) => (ctx.notify ? ctx.notify.push(text, { level: 'error' }) : problem.set(text))
    const actions = createActions(ctx, fail)
    const changes = pulse(ctx, ['models.change', 'thread.select'], ['models'])
    const stateKey = () => JSON.stringify([ctx.models.state(), ctx.threads.current()?.running ?? false])
    let lastKey = stateKey()
    ctx.on('thread.change', id => {
      if (id !== ctx.threads.current()?.id) return
      const key = stateKey()
      if (key === lastKey) return
      lastKey = key
      changes.bump()
    })
    ctx.on('models.change', () => {
      lastKey = stateKey()
    })
    ctx.on('thread.select', () => {
      lastKey = stateKey()
    })
    const pcs = owned(ctx, () => pcStatus(ctx))
    const picker = owned(ctx, () => createPicker(ctx, actions, changes, problem, pcs))
    let slotted = false

    const sheet = (effort: boolean) => void serverCommand(ctx, effort ? 'effort' : 'model', '').catch(error => fail(errorMessage(error)))
    const open = (effort = false) => (slotted ? picker.open(effort) : sheet(effort))

    ctx.watch('composer', composer => {
      if (!composer) return
      slotted = true
      const remove = composer.slot('end', picker.pill, 0)
      return () => {
        slotted = false
        void remove()
      }
    })

    ctx.watch('palette', palette => palette?.source(modelSource(ctx, actions)))
    ctx.watch('settings', settings =>
      settings?.page({ id: 'models', label: 'Models', icon: 'sparkles', order: 20, render: () => modelsPage(ctx, changes) }),
    )

    ctx.watch('commands', commands => {
      if (!commands) return
      const local = (name: 'model' | 'effort', description: string) =>
        commands.add({
          name,
          description,
          source: 'local',
          run: args => (args.trim() ? serverCommand(ctx, name, args) : open(name === 'effort')),
        })
      const added = [local('model', 'Choose the model, effort and fast mode'), local('effort', 'Choose how hard the model thinks')]
      return () => added.forEach(dispose => void dispose())
    })
  },
})
