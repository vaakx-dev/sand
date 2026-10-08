import type { Command, Remotes, UI } from '@sand/protocol'

const listing = (remotes: Remotes) =>
  remotes.list().length ? remotes.list().map(remote => `${remote.name} · ${remote.url}`).join('\n') : 'No other PCs yet.'

export const remoteCommand = (ui: UI, remotes: Remotes): Command => ({
  name: 'remote',
  title: 'Other PCs',
  description: 'List, add or remove other PCs running sand (/remote add <link>, /remote remove <name>)',
  args: '[add <link>|remove <name>]',
  async run(args) {
    const [action, ...rest] = args.trim().split(/\s+/)
    const value = rest.join(' ')
    if (!action) return ui.notify(listing(remotes))
    if (action === 'add' && value) return ui.notify(`Connected ${(await remotes.add(value)).name}`)
    const found = remotes.find(value)
    if (action === 'remove' && found) {
      await remotes.remove(found.id)
      return ui.notify(`Removed ${found.name}`)
    }
    ui.notify('Usage: /remote, /remote add <link> or /remote remove <name>', 'error')
  },
})
