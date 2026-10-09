import { validTarget, validVersion } from './home'
import { readZipEntry } from './zip'

export class UnknownBunTarget extends Error {}

const releases = 'https://github.com/oven-sh/bun/releases/download'

const download = async (url: string, timeout: number) => {
  const response = await fetch(url, { signal: AbortSignal.timeout(timeout), redirect: 'follow' })
  if (!response.ok) throw new Error(`GitHub answered ${response.status} for ${url}`)
  return response
}

const expectedSha = async (version: string, zip: string) => {
  const response = await download(`${releases}/bun-v${version}/SHASUMS256.txt`, 30_000)
  for (const line of (await response.text()).split('\n')) {
    const [sha, file] = line.trim().split(/\s+/)
    if (file?.replace(/^\*/, '') === zip && sha && /^[0-9a-f]{64}$/i.test(sha)) return sha.toLowerCase()
  }
}

const sha256 = (bytes: Uint8Array) => new Bun.CryptoHasher('sha256').update(bytes).digest('hex')

export const fetchOfficialBun = async (version: string, target: string): Promise<Uint8Array<ArrayBuffer>> => {
  if (!validVersion.test(version)) throw new Error(`${version} is not a Bun release version`)
  if (!validTarget.test(target)) throw new Error(`${target} is not a Bun build target`)
  const folder = `bun-${target}`
  const zip = `${folder}.zip`
  const sha = await expectedSha(version, zip)
  if (!sha) throw new UnknownBunTarget(`Bun ${version} has no build for ${target}`)
  const bytes = new Uint8Array(await (await download(`${releases}/bun-v${version}/${zip}`, 10 * 60_000)).arrayBuffer())
  if (sha256(bytes) !== sha) throw new Error(`the Bun ${version} download for ${target} failed its checksum`)
  return readZipEntry(bytes, `${folder}/${target.startsWith('windows-') ? 'bun.exe' : 'bun'}`)
}
