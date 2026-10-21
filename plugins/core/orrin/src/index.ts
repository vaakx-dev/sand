import { definePlugin } from 'drydock'
import { orrinConfig, orrinHome, provideLink } from './plugin'

export default definePlugin({
  name: 'orrin',
  description: 'Finds the Orrin daemon on this PC, signs calls with its local key and follows its events',
  config: orrinConfig,
  async apply(ctx, config) {
    await provideLink(ctx, orrinHome(config))
  },
})
