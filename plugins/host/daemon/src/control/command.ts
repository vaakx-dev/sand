import { existsSync } from 'node:fs'
import { basename } from 'node:path'
import { appMain, bunBinary, installedRoot, readBuildBun } from '@sand/util/boot'

export const hostCommand = async (home: string): Promise<[bun: string, main: string]> => {
  const root = await installedRoot(home)
  if (!root) return [process.execPath, Bun.main]
  const version = await readBuildBun(root)
  if (!version) return [process.execPath, appMain(root)]
  const bun = bunBinary(home, version)
  if (!existsSync(bun)) throw new Error(`sand's Bun ${version} is missing for build ${basename(root).slice(0, 6)}; run Repair from another PC`)
  return [bun, appMain(root)]
}
