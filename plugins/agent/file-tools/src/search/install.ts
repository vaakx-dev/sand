import { fileHash, moveFresh } from '@sand/util/fs'
import { Zip } from '@sand/zip'
import { chmod, mkdir, rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'

interface Build {
  target: string
  sha256: string
  archive: 'zip' | 'tar.gz'
}

const VERSION = '15.2.0'
const RELEASES = `https://github.com/BurntSushi/ripgrep/releases/download/${VERSION}`
const DOWNLOAD_TIMEOUT_MS = 120_000
const MAX_BINARY_BYTES = 64 * 1024 * 1024
const BINARY = process.platform === 'win32' ? 'rg.exe' : 'rg'

const BUILDS: Record<string, Build> = {
  'win32-x64': { target: 'x86_64-pc-windows-msvc', sha256: '71b2fef860abe467217a538ff31de02f5258807c0129f771846f87bd029aafc5', archive: 'zip' },
  'win32-arm64': { target: 'aarch64-pc-windows-msvc', sha256: 'e4abca10c3a64ebea742667dd7009449d49403db5460dd6873e389fa2945360f', archive: 'zip' },
  'linux-x64': { target: 'x86_64-unknown-linux-musl', sha256: '33e15bcf1624b25cdd2a55813a47a2f95dbe126268203e76aa6a585d1e7b149c', archive: 'tar.gz' },
  'linux-arm64': { target: 'aarch64-unknown-linux-musl', sha256: '800b1e7206afe799dfb5a6901f23147cfaabe0e52210538100f61e86e1740915', archive: 'tar.gz' },
  'darwin-x64': { target: 'x86_64-apple-darwin', sha256: 'af7825fcc69a2afc7a7aea55fc9af90e26421d8f20fe59df32e233c0b8a231c1', archive: 'tar.gz' },
  'darwin-arm64': { target: 'aarch64-apple-darwin', sha256: '3750b2e93f37e0c692657da574d7019a101c0084da05a790c83fd335bad973e4', archive: 'tar.gz' },
}

const buildHere = () => {
  const build = BUILDS[`${process.platform}-${process.arch}`]
  if (!build) throw new Error(`sand has no ripgrep for ${process.platform} on ${process.arch}`)
  return build
}

const download = async ({ target, sha256, archive }: Build) => {
  const url = `${RELEASES}/ripgrep-${VERSION}-${target}.${archive}`
  const response = await fetch(url, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) })
  if (!response.ok) throw new Error(`GitHub answered ${response.status} for ${url}`)
  const bytes = new Uint8Array(await response.arrayBuffer())
  if (fileHash(bytes) !== sha256) throw new Error(`The ripgrep ${VERSION} download failed its checksum`)
  return bytes
}

const unpack = async (bytes: Uint8Array<ArrayBuffer>, { target, archive }: Build) => {
  const inside = `ripgrep-${VERSION}-${target}/${BINARY}`
  if (archive === 'zip') return new Zip(bytes, { entryBytes: MAX_BINARY_BYTES, totalBytes: MAX_BINARY_BYTES }).bytes(inside)
  const file = (await new Bun.Archive(bytes).files()).get(inside)
  if (!file) throw new Error(`The ripgrep ${VERSION} download has no ${inside}`)
  return file.bytes()
}

const place = async (path: string, binary: Uint8Array) => {
  await mkdir(dirname(path), { recursive: true })
  const temp = `${path}.${crypto.randomUUID()}.tmp`
  try {
    await Bun.write(temp, binary)
    if (process.platform !== 'win32') await chmod(temp, 0o755)
    await moveFresh(temp, path)
  } finally {
    await rm(temp, { force: true })
  }
}

const install = async (path: string) => {
  const build = buildHere()
  await place(path, await unpack(await download(build), build))
  return path
}

const ripgrepBinary = (folder: string) => join(folder, VERSION, BINARY)

export { install, ripgrepBinary }
