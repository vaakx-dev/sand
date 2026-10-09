import { replaceFile } from '@sand/host'
import type { BuildInfo } from '@sand/protocol'
import { mkdir, rm } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { readStamp } from '../../dist/build'
import { fetchOfficialBun } from '../../dist/bun/github'
import { defaultTarget, readBuildBun, readTarget } from '../../dist/bun/home'
import { extractBundle } from '../../dist/extract'
import { appsFolder, buildFolder, inAppsFolder, readPointer } from '../../dist/layout'
import { readyRelease } from '../../dist/release/ready'
import type { PreparedBuild } from '../types'
import { ensureBun } from './bun'

export const readyFile = '.sand-ready'

const pointers = (home: string) => Promise.all([readPointer(home, 'current'), readPointer(home, 'previous')])

const readyBun = async (home: string, root: string, build: BuildInfo) => {
  const marked = (await Bun.file(join(root, readyFile)).exists()) || (await readPointer(home, 'current')) === basename(root)
  if (!marked || (await readStamp(root))?.id !== build.id) return undefined
  return readBuildBun(root)
}

const freshFolder = (home: string, build: BuildInfo) => buildFolder(home, `${build.id}-${Date.now().toString(36)}`)

const chooseFolder = async (home: string, build: BuildInfo, force: boolean) => {
  const root = buildFolder(home, build.id)
  if (force) return { root: freshFolder(home, build) }
  const bun = await readyBun(home, root, build)
  if (bun) return { root, bun }
  if ((await pointers(home)).includes(build.id)) return { root: freshFolder(home, build) }
  return { root }
}

const sandBun = async (home: string, version: string) => {
  const target = (await readTarget(home)) ?? defaultTarget()
  return ensureBun(home, version, () => fetchOfficialBun(version, target))
}

export const prepareBuild = async (home: string, bytes: Uint8Array, force: boolean): Promise<PreparedBuild> => {
  const folder = appsFolder(home)
  await mkdir(folder, { recursive: true })
  const temp = join(folder, `.incoming-${crypto.randomUUID()}`)
  let placed: string | undefined
  try {
    const build = await extractBundle(bytes, temp)
    const chosen = await chooseFolder(home, build, force)
    const root = chosen.root
    if (!inAppsFolder(home, root)) throw new Error(`build ${build.id} is not a valid sand build`)
    if (chosen.bun) {
      await rm(temp, { recursive: true, force: true })
      return { root, build, bun: chosen.bun, bunPath: await sandBun(home, chosen.bun) }
    }
    await rm(root, { recursive: true, force: true })
    await replaceFile(temp, root)
    placed = root
    const { bun } = await readyRelease(root)
    const bunPath = await sandBun(home, bun)
    await Bun.write(join(root, readyFile), `${build.id}\n`)
    return { root, build, bun, bunPath }
  } catch (error) {
    await rm(temp, { recursive: true, force: true }).catch(() => {})
    if (placed) await rm(placed, { recursive: true, force: true }).catch(() => {})
    throw error
  }
}
