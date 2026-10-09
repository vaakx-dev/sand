import { replaceFile } from '@sand/kit/fs'
import { allowThroughFirewall, bunBinary, validVersion } from '@sand/kit/host'
import { chmod, mkdir, rm } from 'node:fs/promises'
import { dirname } from 'node:path'

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

export const ensureBun = async (home: string, version: string, fetch: () => Promise<Uint8Array>): Promise<string> => {
  if (!validVersion.test(version)) throw new Error(`${version} is not a Bun version`)
  const path = bunBinary(home, version)
  if ((await bunVersion(path)) === version) return path
  await place(path, version, await fetch())
  if (process.platform === 'win32') await allowThroughFirewall(path).catch(() => {})
  return path
}
