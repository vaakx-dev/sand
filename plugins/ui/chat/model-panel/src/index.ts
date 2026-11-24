import { composer as composerService } from '@sand/composer/contract'
import { palette as paletteService } from '@sand/palette/contract'
import { settings as settingsService } from '@sand/settings/contract'
import { definePlugin } from 'drydock'
import { modelButton } from './button'
import { modelChanges } from './changes'
import { inject } from './context'
import { modelButton as modelButtonService, modelTargets as modelTargetsService } from './contract'
import { modelSource } from './palette'
import { modelsPages } from './settings'
import { modelTargets } from './targets'

export default definePlugin({
  name: 'model-panel',
  description: 'The model row that opens the model picker. Also adds palette rows and the Models settings page, where the user sets the default, subagent and text models, adds model accounts and picks which models show.',
  inject,
  apply(ctx) {
    const changes = modelChanges(ctx)

    const button = modelButton(ctx, changes)
    ctx.provide(modelButtonService, button)
    ctx.provide(modelTargetsService, modelTargets())
    ctx.watch(paletteService, palette =>
      palette ? ctx.watch(composerService, composer => composer && palette.source(modelSource(ctx, composer, () => void button.open()))) : undefined,
    )
    ctx.watch(settingsService, settings => settings && modelsPages(ctx, changes, settings))
  },
})
