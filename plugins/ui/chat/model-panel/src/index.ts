import { composer as composerService } from '@sand/composer/contract'
import { palette as paletteService } from '@sand/palette/contract'
import { settings as settingsService } from '@sand/settings/contract'
import { definePlugin } from 'drydock'
import { modelButton } from './button'
import { modelChanges } from './changes'
import { inject } from './context'
import { modelDefaults, modelButton as modelButtonService, modelTargets as modelTargetsService } from './contract'
import { modelSource } from './palette'
import { modelsPage } from './settings'
import { createView } from './settings/page'
import { createSlots } from './settings/slots'
import { modelTargets } from './targets'

export default definePlugin({
  name: 'model-panel',
  description: 'The model row that opens the model picker, and the slot where screens say which model settings a subject runs with. Also adds palette rows and the Models settings page.',
  inject,
  apply(ctx) {
    const changes = modelChanges(ctx)
    const slots = createSlots()

    const button = modelButton(ctx, changes)
    ctx.provide(modelButtonService, button)
    ctx.provide(modelTargetsService, modelTargets())
    ctx.watch(paletteService, palette =>
      palette ? ctx.watch(composerService, composer => composer && palette.source(modelSource(ctx, composer, () => void button.open()))) : undefined,
    )
    ctx.provide(modelDefaults, { slot: slots.add })
    const view = createView()
    const top = () => view.set({ kind: 'top' })
    ctx.watch(settingsService, settings =>
      settings?.page({
        id: 'models',
        label: 'Models',
        icon: 'sparkles',
        group: 'agents',
        order: 20,
        back: () => (view.get().kind === 'top' ? undefined : top),
        render: () => modelsPage(ctx, changes, slots, view),
      }),
    )
  },
})
