import { basename, join } from 'node:path'

const installTimeout = 120_000

const dependencyList = async (folder: string): Promise<Record<string, unknown> | undefined> => {
  const manifest: unknown = await Bun.file(join(folder, 'package.json')).json().catch(() => undefined)
  if (!manifest || typeof manifest !== 'object') return undefined
  const dependencies = (manifest as { dependencies?: unknown }).dependencies
  if (!dependencies || typeof dependencies !== 'object') return undefined
  return dependencies as Record<string, unknown>
}

export const installDependencies = async (folder: string): Promise<void> => {
  const dependencies = await dependencyList(folder)
  if (!dependencies || Object.keys(dependencies).length === 0) return
  const versions = Object.values(dependencies)
  if (versions.some(version => typeof version === 'string' && version.startsWith('workspace:'))) return
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
    try {
      process.kill(child.pid)
    } catch {}
  }, installTimeout)
  try {
    const [code, , stderr] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ])
    if (code === 0 && !timedOut) return
    const detail = timedOut
      ? 'timed out after 2 minutes'
      : (stderr.trim().split('\n').at(-1)?.trim() || `exit code ${code}`)
    throw new Error(`bun install failed in ${basename(folder)}: ${detail}`)
  } finally {
    clearTimeout(timer)
  }
}
