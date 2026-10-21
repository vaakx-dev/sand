import { join } from 'node:path'

export const binaryName = process.platform === 'win32' ? 'orrin.exe' : 'orrin'

export const binFolder = (home: string) => join(home, 'bin')

export const ownBinary = (home: string) => join(binFolder(home), binaryName)

const versionTimeout = 10_000

export const binaryVersion = async (path: string) => {
  const child = Bun.spawn([path, '--version'], { stdout: 'pipe', stderr: 'ignore', windowsHide: true, timeout: versionTimeout })
  const [output, code] = await Promise.all([new Response(child.stdout).text(), child.exited])
  const version = output.trim().split(/\s+/).pop()
  if (code !== 0 || !version) throw new Error(`${path} --version did not answer`)
  return version
}

export const findBinary = async (home: string) => {
  const own = ownBinary(home)
  return (await Bun.file(own).exists()) ? own : (Bun.which('orrin') ?? undefined)
}
