import { join } from 'node:path'

export const validVersion = /^\d+\.\d+\.\d+$/
export const validTarget = /^(linux|darwin|windows)-(x64|aarch64)(-musl)?(-baseline)?$/

export const buildBunFile = 'sand-bun'

export const bunExe = () => (process.platform === 'win32' ? 'bun.exe' : 'bun')

export const bunFolder = (home: string) => join(home, 'bun')

export const bunBinary = (home: string, version: string) => join(bunFolder(home), version, bunExe())

export const targetFile = (home: string) => join(bunFolder(home), 'target')

const readTrimmed = async (file: string) =>
  (
    await Bun.file(file)
      .text()
      .catch(() => '')
  ).trim()

export const readTarget = async (home: string) => {
  const target = await readTrimmed(targetFile(home))
  return validTarget.test(target) ? target : undefined
}

const platforms: Partial<Record<NodeJS.Platform, string>> = { win32: 'windows', linux: 'linux', darwin: 'darwin' }
const arches: Partial<Record<NodeJS.Architecture, string>> = { x64: 'x64', arm64: 'aarch64' }

export const defaultTarget = () => `${platforms[process.platform] ?? process.platform}-${arches[process.arch] ?? process.arch}`

export const readBuildBun = async (root: string) => {
  const version = await readTrimmed(join(root, buildBunFile))
  return validVersion.test(version) ? version : undefined
}

export const writeBuildBun = (root: string, version: string) => Bun.write(join(root, buildBunFile), version)
