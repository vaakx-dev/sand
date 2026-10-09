import { definePlugin } from 'drydock'

export default definePlugin({
  name: 'cli-release',
  description: 'The sand release-assets command: writes the release bundle and stamp for a GitHub release',
  inject: ['cliCommands'],
  apply(ctx) {
    ctx.effect(() =>
      ctx.cliCommands.register({
        name: 'release-assets',
        summary: 'write sand.tar.gz and sand-build.json for a GitHub release into a folder',
        usage: 'sand release-assets <folder>    write sand.tar.gz and sand-build.json for a GitHub release into a folder',
        run: async args => (await import('./release')).releaseAssets(args),
      }),
    )
  },
})
