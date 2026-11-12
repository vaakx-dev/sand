import { cliCommands } from '@sand/cli-commands/contract'
import { daemon } from '@sand/host-daemon/contract'
import { definePlugin } from 'drydock'
import { type Addon, addonsInstall, addonsRemove, addonsUpdate, type FeatureChoice, featuresList } from './contract'

const ACTION_TIMEOUT_MS = 10 * 60_000

const USAGE = [
  'sand addons                      list the add-ons: installed, built in or available from the catalog',
  'sand addons install <id>...      download add-ons, with the add-ons they need, and turn them on',
  'sand addons update <id>...       download newer versions of installed add-ons',
  'sand addons remove <id>...       turn add-ons off and delete them',
].join('\n')

const ACTIONS = { install: addonsInstall, update: addonsUpdate, remove: addonsRemove }

const stateText = (addon: Addon, on: boolean) => {
  if (addon.status === 'available') return addon.needsSand ? `available, needs sand ${addon.needsSand}` : 'available'
  const state = `${addon.status}, ${on ? 'on' : 'off'}`
  return addon.update ? `${state}, update ${addon.update}` : state
}

const printChoice = ({ addons, features, catalogError }: FeatureChoice) => {
  const on = new Set(features.filter(feature => feature.on).map(feature => feature.id))
  const width = Math.max(0, ...addons.map(addon => addon.id.length))
  for (const addon of addons) console.log(`${addon.id.padEnd(width)}  ${addon.label} (${stateText(addon, on.has(addon.id))})`)
  if (catalogError) console.error(catalogError)
}

const isAction = (name: string | undefined): name is keyof typeof ACTIONS => name !== undefined && Object.hasOwn(ACTIONS, name)

export default definePlugin({
  name: 'features-cli',
  description: 'The sand addons command: lists, installs, updates and removes add-ons through the running sand',
  inject: { cliCommands, daemon },
  apply(ctx) {
    ctx.effect(() =>
      ctx.cliCommands.register({
        name: 'addons',
        summary: 'list, install, update and remove add-ons',
        usage: USAGE,
        async run([action, ...ids]) {
          if (action === undefined) return printChoice(await ctx.daemon.request(featuresList, {}))
          if (!isAction(action) || !ids.length) {
            console.error(`usage:\n${USAGE}`)
            return 2
          }
          printChoice(await ctx.daemon.request(ACTIONS[action], { ids }, { timeout: ACTION_TIMEOUT_MS }))
        },
      }),
    )
  },
})
