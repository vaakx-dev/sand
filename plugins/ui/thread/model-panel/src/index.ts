import type {} from '@sand/model-picker/contract'
import { joinDisposers } from '@sand/kit'
import { owned } from '@sand/kit/web'
import { sig } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { createActions } from './actions'
import { modelChanges } from './changes'
import { modelSource } from './palette'
import { modelPill } from './pill'
import { modelsPage } from './settings'
import { composerTarget } from './target'

export default definePlugin({
  name: 'model-panel',
  description: 'One pill in the composer that opens the model picker. Also adds palette rows and the Models settings page.',
  inject: ['kit', 'models', 'modelPicker', 'threads'],
  uses: {
    composer: 'no pill; /model and /effort open the server sheet',
    palette: 'no model rows in the palette',
    commands: '/model and /effort with no argument open the server sheet',
    notify: 'problems show inside the panel',
    settings: 'no Models settings page',
    wire: 'model changes cannot be saved',
  },
  apply(ctx) {
    const problem = sig('')
    const fail = (text: string) => (ctx.notify ? ctx.notify.push(text, { level: 'error' }) : problem.set(text))
    const actions = createActions(ctx, fail)
    const changes = modelChanges(ctx)
    const pill = owned(ctx, () => modelPill(ctx, composerTarget(ctx, actions, changes, problem), changes))
    let slotted = false
    const open = (effort: boolean) => (slotted ? pill.open(effort) : actions.run(effort ? 'effort' : 'model'))

    ctx.watch('composer', composer => {
      if (!composer) return
      slotted = true
      const remove = composer.slot('end', pill.view, 0)
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
          run: args => (args.trim() ? ctx.threads.command(name, args) : open(name === 'effort')),
        })
      return joinDisposers(local('model', 'Choose the model, effort and fast mode'), local('effort', 'Choose how hard the model thinks'))
    })
  },
})
