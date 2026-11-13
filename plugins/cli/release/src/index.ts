import { cliCommands } from '@sand/cli-commands/contract'
import { definePlugin } from 'drydock'

export default definePlugin({
  name: 'cli-release',
  description: 'The sand release-assets command: writes the core bundle, its stamp, the add-on files and their catalog for a GitHub release',
  inject: { cliCommands },
  apply(ctx) {
    ctx.effect(() =>
      ctx.cliCommands.register({
        name: 'release-assets',
        summary: 'write the release files for a GitHub release into a folder',
        usage: 'sand release-assets <folder>    write sand.tar.gz, sand-build.json, the add-on files and sand-addons.json for a GitHub release into a folder',
        run: async args => (await import('./release')).releaseAssets(args),
      }),
    )
  },
})
