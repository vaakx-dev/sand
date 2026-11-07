import { composer as composerService } from '@sand/composer/contract'
import { palette as paletteService } from '@sand/palette/contract'
import { settings as settingsService } from '@sand/settings/contract'
import { joinDisposers } from '@sand/util'
import { owned } from '@sand/reactive'
import { sig } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { createActions } from './actions'
import { modelChanges } from './changes'
import { inject } from './context'
import { modelDefaults, modelPill as modelPillService } from './contract'
import { modelSource } from './palette'
import { modelPill } from './pill'
import { modelsPage } from './settings'
import { createSlots } from './settings/slots'
import { shownState } from './shown'
import { composerTarget } from './target'

export default definePlugin({
  name: 'model-panel',
  description: 'One pill in the composer that opens the model picker. Also adds palette rows and the Models settings page.',
  inject,
  apply(ctx) {
    const problem = sig('')
    const actions = createActions(ctx, text => problem.set(text))
    const changes = modelChanges(ctx)
    const slots = createSlots()
    const shown = shownState(ctx)
    const pill = owned(ctx, () => modelPill(ctx, composerTarget(ctx, actions, changes, problem, shown), changes, shown))

    ctx.watch(composerService, composer => composer && joinDisposers(composer.slot('end', pill.view, 0), ctx.provide(modelPillService, { open: pill.open })))
    ctx.watch(paletteService, palette => (palette ? ctx.watch(composerService, composer => composer && palette.source(modelSource(ctx, actions, shown))) : undefined))
    ctx.provide(modelDefaults, { slot: slots.add })
    ctx.watch(settingsService, settings =>
      settings?.page({ id: 'models', label: 'Models', icon: 'sparkles', group: 'agents', order: 20, render: () => modelsPage(ctx, changes, slots) }),
    )
  },
})
