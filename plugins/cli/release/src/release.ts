import type { GitRunner } from '@sand/git/contract'
import { mkdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { bundleAsset, stampAsset } from '@sand/util/boot/release'
import { appRoot } from '@sand/util/boot'
import { packBundle } from './bundle'
import { buildHistory } from './history'

export const releaseAssets = async ([folder]: string[], git: GitRunner | undefined) => {
  if (!folder) throw new Error('usage: sand release-assets <folder>')
  const out = resolve(folder)
  await mkdir(out, { recursive: true })
  const root = appRoot(Bun.main)
  const { stamp, bytes } = await packBundle(root, await buildHistory(git, root))
  await Bun.write(join(out, bundleAsset), bytes)
  await Bun.write(join(out, stampAsset), JSON.stringify(stamp))
  console.log(`build ${stamp.id} (Bun ${stamp.bun}): ${join(out, bundleAsset)} (${bytes.length} bytes), ${join(out, stampAsset)}`)
}
