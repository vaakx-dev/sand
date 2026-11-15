import { fileHash, shaSumFor } from '@sand/util/fs'
import { validTarget, validVersion } from '@sand/util/release'
import { Zip } from '@sand/zip'

const releases = 'https://github.com/oven-sh/bun/releases/download'

const MAX_BUN_BYTES = 512 * 1024 * 1024

const download = async (url: string, timeout: number) => {
  const response = await fetch(url, { signal: AbortSignal.timeout(timeout), redirect: 'follow' })
  if (!response.ok) throw new Error(`GitHub answered ${response.status} for ${url}`)
  return response
}

const expectedSha = async (version: string, zip: string) => {
  const response = await download(`${releases}/bun-v${version}/SHASUMS256.txt`, 30_000)
  return shaSumFor(await response.text(), zip)
}

export const fetchOfficialBun = async (version: string, target: string): Promise<Uint8Array<ArrayBuffer>> => {
  if (!validVersion.test(version)) throw new Error(`${version} is not a Bun release version`)
  if (!validTarget.test(target)) throw new Error(`${target} is not a Bun build target`)
  const folder = `bun-${target}`
  const zip = `${folder}.zip`
  const sha = await expectedSha(version, zip)
  if (!sha) throw new Error(`Bun ${version} has no build for ${target}`)
  const bytes = new Uint8Array(await (await download(`${releases}/bun-v${version}/${zip}`, 10 * 60_000)).arrayBuffer())
  if (fileHash(bytes) !== sha) throw new Error(`the Bun ${version} download for ${target} failed its checksum`)
  const archive = new Zip(bytes, { entryBytes: MAX_BUN_BYTES, totalBytes: MAX_BUN_BYTES })
  return archive.bytes(`${folder}/${target.startsWith('windows-') ? 'bun.exe' : 'bun'}`)
}
