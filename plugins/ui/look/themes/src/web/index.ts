import { wire } from '@sand/devices-contract'
import { definePlugin } from 'drydock'
import { applyTheme } from './apply'
import { themeChat } from './chat'
import { themeModel } from './model'
import { themeSettings } from './settings'

export default definePlugin({
  name: 'themes-web',
  description: "Paints sand in the chosen theme: its colours, custom CSS and animated background, with Settings › Theme. Opening sand with ?theme=off resets it to sand's own look",
  inject: { wire },
  apply(ctx) {
    const model = themeModel(ctx, ctx.wire)
    applyTheme(ctx, model.shown)
    ctx.plugin(themeSettings(model))
    ctx.plugin(themeChat(model))
  },
})
