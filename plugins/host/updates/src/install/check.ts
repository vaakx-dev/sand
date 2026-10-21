import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const loadTimeout = 60 * 1000

const entryPoints = (root: string) => [join(root, 'apps', 'sand', 'src', 'app', 'run.ts')]

const loadScript = (root: string) =>
  [...entryPoints(root).map(file => `await import(${JSON.stringify(pathToFileURL(file).href)})`), 'process.exit(0)'].join('\n')

const lastLines = (text: string, count: number) =>
  text
    .split(/\r?\n/)
    .map(line => line.trimEnd())
    .filter(Boolean)
    .slice(-count)
    .join('\n')

export const checkLoads = async (root: string, bun: string): Promise<void> => {
  const proc = Bun.spawn([bun, '-e', loadScript(root)], {
    cwd: root,
    stdin: 'ignore',
    stdout: 'ignore',
    stderr: 'pipe',
    windowsHide: true,
    timeout: loadTimeout,
  })
  const [err, code] = await Promise.all([new Response(proc.stderr).text(), proc.exited])
  if (code === 0 && !proc.signalCode) return
  const detail = lastLines(err, 8) || (proc.signalCode ? 'it timed out' : `exit code ${code}`)
  throw new Error(`the new sand does not load: ${detail}`)
}
