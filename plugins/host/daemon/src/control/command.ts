import { appMain, installedRoot } from '@sand/boot'
import { bunBinary, readBuildBun } from '@sand/util/release'
import { existsSync } from 'node:fs'
import { basename } from 'node:path'

export const hostCommand = async (home: string): Promise<[bun: string, main: string]> => {
  const root = await installedRoot(home)
  if (!root) return [process.execPath, Bun.main]
  const version = await readBuildBun(root)
  if (!version) return [process.execPath, appMain(root)]
  const bun = bunBinary(home, version)
  if (!existsSync(bun)) throw new Error(`sand's Bun ${version} is missing for build ${basename(root).slice(0, 6)}; run Repair from another PC`)
  return [bun, appMain(root)]
}
