import { mkdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { appRoot, bundleAsset, packBundle, stampAsset } from '@sand/kit/host'

export const releaseAssets = async ([folder]: string[]) => {
  if (!folder) throw new Error('usage: sand release-assets <folder>')
  const out = resolve(folder)
  await mkdir(out, { recursive: true })
  const { stamp, bytes } = await packBundle(appRoot(Bun.main))
  await Bun.write(join(out, bundleAsset), bytes)
  await Bun.write(join(out, stampAsset), JSON.stringify(stamp))
  console.log(`build ${stamp.id} (Bun ${stamp.bun}): ${join(out, bundleAsset)} (${bytes.length} bytes), ${join(out, stampAsset)}`)
}
