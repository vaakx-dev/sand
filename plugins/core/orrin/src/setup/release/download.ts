import { fileHash, shaSumFor } from '@sand/util/fs'
import type { OrrinRelease, ReleaseFile } from './latest'

const downloadTimeout = 10 * 60_000
const sumsTimeout = 30_000

const get = async (url: string, timeout: number) => {
  const response = await fetch(url, { headers: { 'user-agent': 'sand' }, signal: AbortSignal.timeout(timeout), redirect: 'follow' })
  if (!response.ok || !response.body) throw new Error(`${url} answered HTTP ${response.status}`)
  return response
}

const readAll = async (response: Response, size: number, progress: (percent: number) => void) => {
  const bytes = new Uint8Array(size)
  let received = 0
  for await (const chunk of response.body!) {
    if (received + chunk.length > size) throw new Error('the download is bigger than the release says')
    bytes.set(chunk, received)
    received += chunk.length
    progress(Math.floor((received / size) * 100))
  }
  if (received !== size) throw new Error('the download stopped early; try again')
  return bytes
}

export const downloadArchive = (archive: ReleaseFile, progress: (percent: number) => void) =>
  get(archive.url, downloadTimeout).then(response => readAll(response, archive.size, progress))

export const verifyArchive = async ({ version, archive, sums }: OrrinRelease, bytes: Uint8Array) => {
  if (!archive || !sums) throw new Error(`Orrin ${version} has no SHA256SUMS to check the download against`)
  const expected = shaSumFor(await (await get(sums.url, sumsTimeout)).text(), archive.name)
  if (!expected) throw new Error(`SHA256SUMS of Orrin ${version} does not list ${archive.name}`)
  if (fileHash(bytes) !== expected) throw new Error(`the Orrin ${version} download failed its checksum`)
}
