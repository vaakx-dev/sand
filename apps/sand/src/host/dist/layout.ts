import { replaceFile } from '@sand/host'
import { mkdir, rm } from 'node:fs/promises'
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path'

type Pointer = 'current' | 'previous'

const pointers = new Set<string>(['current', 'previous'])
const validName = /^[A-Za-z0-9][A-Za-z0-9_-]*$/

const isBuildName = (name: string) => validName.test(name) && !pointers.has(name)

export const appsFolder = (home: string) => join(home, 'app')

export const binFolder = (home: string) => join(home, 'bin')

export const currentFile = (home: string) => join(appsFolder(home), 'current')

export const inAppsFolder = (home: string, folder: string) => resolve(dirname(folder)) === resolve(appsFolder(home))

export const buildFolder = (home: string, name: string) => {
  if (!isBuildName(name)) throw new Error(`${name} is not a sand build name`)
  return join(appsFolder(home), name)
}

export const appMain = (root: string) => join(root, 'apps', 'sand', 'src', 'main.ts')

export const isInstalled = (root: string, home: string) => {
  const path = relative(appsFolder(home), root)
  return !path.startsWith('..') && !isAbsolute(path)
}

export const readPointer = async (home: string, name: Pointer): Promise<string | undefined> => {
  const value = await Bun.file(join(appsFolder(home), name))
    .text()
    .then(
      text => text.trim(),
      () => undefined,
    )
  return value && isBuildName(value) ? value : undefined
}

const writePointer = async (home: string, name: Pointer, value: string) => {
  const folder = appsFolder(home)
  await mkdir(folder, { recursive: true })
  const file = join(folder, name)
  await Bun.write(`${file}.tmp`, value)
  await replaceFile(`${file}.tmp`, file)
}

export const installedRoot = async (home: string): Promise<string | undefined> => {
  const current = await readPointer(home, 'current')
  if (current && (await Bun.file(appMain(buildFolder(home, current))).exists())) return buildFolder(home, current)
  if (await Bun.file(appMain(appsFolder(home))).exists()) return appsFolder(home)
  return undefined
}

export const switchTo = async (home: string, name: string) => {
  buildFolder(home, name)
  const current = await readPointer(home, 'current')
  if (current && current !== name) await writePointer(home, 'previous', current)
  await writePointer(home, 'current', name)
}

export const setCurrentApp = async (home: string, folder: string): Promise<void> => {
  if (!inAppsFolder(home, folder)) throw new Error(`${folder} is not in ${appsFolder(home)}`)
  await switchTo(home, basename(folder))
}

export const restorePrevious = async (home: string): Promise<string | undefined> => {
  const previous = await readPointer(home, 'previous')
  if (previous) await writePointer(home, 'current', previous)
  else await rm(currentFile(home), { force: true })
  return previous
}
