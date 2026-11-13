import { cliCommands } from '@sand/cli-commands/contract'
import { type Daemon, daemon } from '@sand/host-daemon/contract'
import { definePlugin } from 'drydock'
import { type Addon, addonsInstall, addonsRemove, addonsSourceAdd, addonsSourceRemove, addonsUpdate, type FeatureChoice, featuresList } from './contract'

const ACTION_TIMEOUT_MS = 10 * 60_000

const USAGE = [
  'sand addons                         list the add-ons: installed, built in or available from your sources',
  'sand addons install <id>...         download add-ons, with the add-ons they need, and turn them on',
  'sand addons update <id>...          download newer versions of installed add-ons',
  'sand addons remove <id>...          turn add-ons off and delete them',
  'sand addons sources                 list where add-ons come from',
  'sand addons source add <repo | url> add a GitHub repository (owner/name) or catalog address as a source',
  'sand addons source remove <id>      remove a source you added',
].join('\n')

const TRUST = 'Add-ons from other sources run on this PC with the same access as sand, like any plugin. Install only from people you trust.'

const ACTIONS = { install: addonsInstall, update: addonsUpdate, remove: addonsRemove }

const stateText = (addon: Addon, on: boolean) => {
  if (addon.status === 'available') return addon.needsSand ? `available, needs sand ${addon.needsSand}` : 'available'
  const state = `${addon.status}, ${on ? 'on' : 'off'}`
  return addon.update ? `${state}, update ${addon.update}` : state
}

const fromText = (addon: Addon) => (addon.source ? `, from ${addon.source.label}` : '')

const printAddons = ({ addons, features, sources }: FeatureChoice) => {
  const on = new Set(features.filter(feature => feature.on).map(feature => feature.id))
  const width = Math.max(0, ...addons.map(addon => addon.id.length))
  for (const addon of addons) console.log(`${addon.id.padEnd(width)}  ${addon.label} (${stateText(addon, on.has(addon.id))}${fromText(addon)})`)
  for (const { label, error } of sources) if (error) console.error(`${label}: ${error}`)
}

const printSources = ({ sources }: FeatureChoice) => {
  for (const { id, label, error } of sources) console.log(`${id}${label === id ? '' : `  ${label}`}${error ? `  (${error})` : ''}`)
}

const isAction = (name: string | undefined): name is keyof typeof ACTIONS => name !== undefined && Object.hasOwn(ACTIONS, name)

const usage = () => {
  console.error(`usage:\n${USAGE}`)
  return 2
}

const sourceCommand = async (link: Daemon, [action, value]: string[]) => {
  if (!value) return usage()
  if (action === 'add') {
    printSources(await link.request(addonsSourceAdd, { source: value }))
    console.log(TRUST)
    return
  }
  if (action === 'remove') return printSources(await link.request(addonsSourceRemove, { id: value }))
  return usage()
}

export default definePlugin({
  name: 'features-cli',
  description: 'The sand addons command: lists, installs, updates and removes add-ons, and adds and removes their sources, through the running sand',
  inject: { cliCommands, daemon },
  apply(ctx) {
    ctx.effect(() =>
      ctx.cliCommands.register({
        name: 'addons',
        summary: 'list, install, update and remove add-ons, and manage where they come from',
        usage: USAGE,
        async run([action, ...rest]) {
          if (action === undefined) return printAddons(await ctx.daemon.request(featuresList, {}))
          if (action === 'sources') return printSources(await ctx.daemon.request(featuresList, {}))
          if (action === 'source') return sourceCommand(ctx.daemon, rest)
          if (!isAction(action) || !rest.length) return usage()
          printAddons(await ctx.daemon.request(ACTIONS[action], { ids: rest }, { timeout: ACTION_TIMEOUT_MS }))
        },
      }),
    )
  },
})
