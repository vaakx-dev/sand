import { join } from 'node:path'
import { readManifest } from './workspaces'

const appVersion = async (root: string) => {
  const version = (await readManifest(join(root, 'apps', 'sand')))?.version
  if (typeof version !== 'string') throw new Error('apps/sand/package.json has no version')
  return version
}

export { appVersion }
