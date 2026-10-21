import { composer as composerService } from '@sand/composer/contract'
import { palette as paletteService } from '@sand/palette/contract'
import { settings as settingsService } from '@sand/settings/contract'
import { joinDisposers } from '@sand/util'
import { owned } from '@sand/web-client/reactive'
import { sig } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { createActions } from './actions'
import { modelChanges } from './changes'
import { inject } from './context'
import { modelPill as modelPillService } from './contract'
import { modelSource } from './palette'
import { modelPill } from './pill'
import { modelsPage } from './settings'
import { composerTarget } from './target'

export default definePlugin({
  name: 'model-panel',
  description: 'One pill in the composer that opens the model picker. Also adds palette rows and the Models settings page.',
  inject,
  apply(ctx) {
    const problem = sig('')
    const actions = createActions(ctx, text => problem.set(text))
    const changes = modelChanges(ctx)
    const pill = owned(ctx, () => modelPill(ctx, composerTarget(ctx, actions, changes, problem), changes))

    ctx.watch(composerService, composer => composer && joinDisposers(composer.slot('end', pill.view, 0), ctx.provide(modelPillService, { open: pill.open })))
    ctx.watch(paletteService, palette => palette?.source(modelSource(ctx, actions)))
    ctx.watch(settingsService, settings =>
      settings?.page({ id: 'models', label: 'Models', icon: 'sparkles', order: 20, render: () => modelsPage(ctx, changes) }),
    )
  },
})
