import { loadUpdateStore } from '@sand/boot/updates'
import { cli, features } from '@sand/config/contract'
import { hostApp } from '@sand/host-daemon/contract'
import { hub } from '@sand/host-hub/contract'
import { runtimes } from '@sand/host-runtimes/contract'
import { buildAddons } from '@sand/host-updates/contract'
import { errorMessage } from '@sand/util'
import { appVersion, coreBuild, readStamp } from '@sand/util/release'
import { definePlugin } from 'drydock'
import { join } from 'node:path'
import { z } from 'zod'
import { createAddons } from './addons/actions'
import { buildShelf, fetchShelf } from './addons/catalog'
import { sourceStore } from './addons/sources'
import { addonsInstall, addonsPicture, addonsReady, addonsRemove, addonsSourceAdd, addonsSourceRemove, addonsUpdate, featuresList, featuresSet } from './contract'

const MAIN = { id: 'vaakx-dev/sand', label: 'vaakx-dev/sand', removable: false }

const NO_CATALOG = 'the new sand build has no add-on catalog on GitHub yet; it may still be uploading, so try again in a few minutes'

export default definePlugin({
  name: 'features',
  description:
    "Lists the features and add-ons, turns features on or off, installs, updates and removes add-ons from the catalog of the running sand build and the sources you add, keeps installed add-ons matched to the build, and adds and removes those sources: writes [features] in sand.toml, loads or unloads the host plugins and starts a fresh runtime",
  inject: { cli, hub, features, runtimes, hostApp },
  config: z.object({ catalog: z.string().url().optional() }),
  async apply(ctx, config) {
    const { home, builtins } = ctx.cli
    const version = await appVersion(join(builtins, '..'))
    const stamp = () => readStamp(ctx.hostApp.root())
    const mainShelf = async () => {
      const [found, store] = await Promise.all([stamp(), loadUpdateStore(home)])
      return buildShelf({ hashes: found?.addons, channel: store.channel(), version, override: config.catalog })
    }
    const addons = createAddons({
      root: join(home, 'plugins'),
      version,
      build: () => coreBuild(join(ctx.hostApp.root(), 'plugins')),
      features: ctx.features,
      runtimes: ctx.runtimes,
      main: { ...MAIN, shelf: mainShelf },
      saved: sourceStore(home),
    })
    ctx.provide(buildAddons, {
      stage: ({ addons: hashes, catalog }) =>
        addons.stage(hashes ?? {}, async () => {
          if (!catalog) throw new Error(NO_CATALOG)
          return fetchShelf(catalog)
        }),
    })
    void stamp()
      .then(found => found?.addons && addons.match(found.addons))
      .catch(error => console.error(`sand could not bring its add-ons up to this build: ${errorMessage(error)}`))
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
