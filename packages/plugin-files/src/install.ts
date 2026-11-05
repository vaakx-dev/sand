import { basename, join } from 'node:path'
import { isRecord } from '@sand/util'

const installTimeout = 120_000

const dependencyVersions = async (folder: string) => {
  const manifest: unknown = await Bun.file(join(folder, 'package.json'))
    .json()
    .catch(() => undefined)
  return isRecord(manifest) && isRecord(manifest.dependencies) ? Object.values(manifest.dependencies) : []
}

const isWorkspace = (version: unknown) => typeof version === 'string' && version.startsWith('workspace:')

export const installDependencies = async (folder: string): Promise<void> => {
  const versions = await dependencyVersions(folder)
  if (!versions.length || versions.some(isWorkspace)) return
  const child = Bun.spawn([process.execPath, 'install'], {
    cwd: folder,
    stdin: 'ignore',
    stdout: 'pipe',
    stderr: 'pipe',
    windowsHide: true,
  })
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    child.kill()
  }, installTimeout)
  try {
    const [code, , stderr] = await Promise.all([child.exited, new Response(child.stdout).text(), new Response(child.stderr).text()])
    if (code === 0 && !timedOut) return
    const detail = timedOut ? 'timed out after 2 minutes' : stderr.trim().split('\n').at(-1)?.trim() || `exit code ${code}`
    throw new Error(`bun install failed in ${basename(folder)}: ${detail}`)
  } finally {
    clearTimeout(timer)
  }
}
