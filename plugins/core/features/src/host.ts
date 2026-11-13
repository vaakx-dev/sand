import { loadUpdateStore } from '@sand/boot/updates'
import { cli, features } from '@sand/config/contract'
import { hub } from '@sand/host-hub/contract'
import { runtimes } from '@sand/host-runtimes/contract'
import { appVersion } from '@sand/util/release'
import { definePlugin } from 'drydock'
import { join } from 'node:path'
import { z } from 'zod'
import { createAddons } from './addons/actions'
import { channelUrl } from './addons/catalog'
import { sourceStore } from './addons/sources'
import { addonsInstall, addonsPicture, addonsReady, addonsRemove, addonsSourceAdd, addonsSourceRemove, addonsUpdate, featuresList, featuresSet } from './contract'

const MAIN = { id: 'vaakx-dev/sand', label: 'vaakx-dev/sand', removable: false }

export default definePlugin({
  name: 'features',
  description:
    "Lists the features and add-ons, turns features on or off, installs, updates and removes add-ons from the catalogs of sand's releases and the sources you add, and adds and removes those sources: writes [features] in sand.toml, loads or unloads the host plugins and starts a fresh runtime",
  inject: { cli, hub, features, runtimes },
  config: z.object({ catalog: z.string().url().optional() }),
  async apply(ctx, config) {
    const { home, builtins } = ctx.cli
    const catalogUrl = async () => config.catalog ?? channelUrl((await loadUpdateStore(home)).channel())
    const addons = createAddons({
      root: join(home, 'plugins'),
      version: await appVersion(join(builtins, '..')),
      features: ctx.features,
      runtimes: ctx.runtimes,
      main: { ...MAIN, url: catalogUrl },
      saved: sourceStore(home),
    })
    ctx.effect(() => ctx.hub.handle(featuresList, () => addons.choice()))
    ctx.effect(() => ctx.hub.handle(addonsReady, () => addons.ready()))
    ctx.effect(() => ctx.hub.handle(addonsPicture, ({ id, file }) => addons.picture(id, file)))
    ctx.effect(() => ctx.hub.handle(featuresSet, ({ changes }) => addons.set(changes)))
    ctx.effect(() => ctx.hub.handle(addonsInstall, ({ ids }) => addons.install(ids)))
    ctx.effect(() => ctx.hub.handle(addonsUpdate, ({ ids }) => addons.update(ids)))
    ctx.effect(() => ctx.hub.handle(addonsRemove, ({ ids }) => addons.remove(ids)))
    ctx.effect(() => ctx.hub.handle(addonsSourceAdd, ({ source }) => addons.addSource(source)))
    ctx.effect(() => ctx.hub.handle(addonsSourceRemove, ({ id }) => addons.removeSource(id)))
  },
})
