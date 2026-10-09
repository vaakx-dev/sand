import { mkdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { packBundle } from '../host/dist/bundle'
import { appRoot } from '../host/dist/root'
import { bundleAsset, stampAsset } from '../host/github'

export const releaseAssets = async ([folder]: string[]) => {
  if (!folder) throw new Error('usage: sand release-assets <folder>')
  const out = resolve(folder)
  await mkdir(out, { recursive: true })
  const { stamp, bytes } = await packBundle(appRoot(join(import.meta.dir, '..', 'main.ts')))
  await Bun.write(join(out, bundleAsset), bytes)
  await Bun.write(join(out, stampAsset), JSON.stringify(stamp))
  console.log(`build ${stamp.id} (Bun ${stamp.bun}): ${join(out, bundleAsset)} (${bytes.length} bytes), ${join(out, stampAsset)}`)
}
