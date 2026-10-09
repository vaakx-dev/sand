import { definePlugin } from 'drydock'
import { projectFlags } from './flags'
import { projects } from './projects'

export default definePlugin({
  name: 'cli-project',
  description: 'The sand project command: lists, copies and syncs projects across PCs',
  inject: ['cli', 'cliCommands', 'daemon'],
  apply(ctx) {
    ctx.effect(() =>
      ctx.cliCommands.register({
        name: 'project',
        summary: 'list projects and their copies on every PC',
        usage: [
          'sand project [list] [--all]     list projects and their copies on every PC, with git remote and missing folders',
          'sand project add <path> | rename <name> <new name> | hide <name> | show <name>',
          'sand project remove <name|path> [--on <pc>]   delete the project on every PC, or with --on forget that PC copy;',
          '                                folders stay on disk',
          'sand project root [path] [--on <pc>]    print or set the folder new projects go in',
          'sand project copy <name> --to <pc> [--from <pc>] [--path <folder>] [--setup]   put a copy of a project on another PC',
          'sand project sync <name> --from <pc> --to <pc>   send the newest work, merging if both changed',
          'sand project status <name>      compare the copies of a project across PCs',
          'sand project resolve <name> --on <pc> (--ours | --theirs) [file…]   settle merge conflicts',
        ].join('\n'),
        options: [
          '  --on <pc>   the PC a project command acts on',
          '  --from <pc> --to <pc>   the PCs a project is copied or synced between ("this" is the PC you are on)',
          '  --path <dir>            where copy puts the project (default: the project folder of the target PC)',
          '  --setup                 run the project setup command (install dependencies) after copy',
          '  --all                   include hidden projects in the list',
          '  --ours | --theirs       keep the receiving PC version or the incoming one when resolving',
        ].join('\n'),
        run: (args, values) => projects(ctx.daemon, ctx.cli.home, args, projectFlags(values)),
      }),
    )
  },
})
