import { replaceFile } from '@sand/host'
import { chmod, mkdir, rm } from 'node:fs/promises'
import { dirname } from 'node:path'
import { allowThroughFirewall } from '../../../commands/install/firewall'
import { bunBinary, validVersion } from '../../dist/bun/home'
import type { BunDownload } from '../types'

const versionTimeout = 15_000

const bunVersion = async (file: string) => {
  try {
    const proc = Bun.spawn([file, '--version'], {
      stdin: 'ignore',
      stdout: 'pipe',
      stderr: 'ignore',
      windowsHide: true,
      timeout: versionTimeout,
    })
    const [out, code] = await Promise.all([new Response(proc.stdout).text(), proc.exited])
    return code === 0 ? out.trim() : undefined
  } catch {
    return undefined
  }
}

const sha256 = (bytes: Uint8Array) => new Bun.CryptoHasher('sha256').update(bytes).digest('hex')

const unpack = (version: string, download: BunDownload) => {
  if (download.version !== version) throw new Error(`the other PC sent Bun ${download.version}, not Bun ${version}`)
  const binary = Bun.gunzipSync(download.bytes as Uint8Array<ArrayBuffer>)
  if (sha256(binary) !== download.sha256.toLowerCase()) throw new Error(`the Bun ${version} download is damaged`)
  return binary
}

const place = async (path: string, version: string, binary: Uint8Array) => {
  await mkdir(dirname(path), { recursive: true })
  const temp = `${path}.tmp-${crypto.randomUUID()}`
  try {
    await Bun.write(temp, binary)
    if (process.platform !== 'win32') await chmod(temp, 0o755)
    const found = await bunVersion(temp)
    if (found !== version) throw new Error(`the Bun ${version} download does not run${found ? ` (it says ${found})` : ''}`)
    await replaceFile(temp, path)
  } finally {
    await rm(temp, { force: true }).catch(() => {})
  }
}

export const ensureBun = async (home: string, version: string, fetch: () => Promise<BunDownload>): Promise<string> => {
  if (!validVersion.test(version)) throw new Error(`${version} is not a Bun version`)
  const path = bunBinary(home, version)
  if ((await bunVersion(path)) === version) return path
  await place(path, version, unpack(version, await fetch()))
  if (process.platform === 'win32') await allowThroughFirewall(path).catch(() => {})
  return path
}
