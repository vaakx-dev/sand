import { onMedia } from '@vaakx-dev/vrui'
import { definePlugin, type Dispose } from 'drydock'
import { lightScheme, sand, sandLight, theme } from './contract'

export default definePlugin({
  name: 'theme',
  description: "Sand's colors, light or dark to follow the system; another theme plugin can provide its own",
  apply(ctx) {
    let provided: Dispose | undefined
    ctx.effect(() =>
      onMedia(lightScheme, light => {
        const previous = provided
        provided = ctx.provide(theme, light ? sandLight : sand)
        previous?.()
      }),
    )
  },
})
