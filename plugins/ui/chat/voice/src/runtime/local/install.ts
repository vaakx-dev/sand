import { isRecord } from '@sand/util'
import { exists } from '@sand/util/fs'
import { join } from 'node:path'

const ENGINE = ['transcribe-cpp@0.4.1', 'koffi@3.3.8']

const ENGINE_VERSION = '0.4.1'

const BUILDS: Record<string, string> = {
  'win32-x64': 'win32-x64-cpu-vulkan',
  'linux-x64': 'linux-x64-cpu-vulkan',
  'linux-arm64': 'linux-arm64-cpu-vulkan',
  'darwin-arm64': 'darwin-arm64-metal',
  'darwin-x64': 'darwin-x64-cpu',
}

const VC_RUNTIME = ['vcruntime140.dll', 'vcruntime140_1.dll', 'msvcp140.dll']

const VC_RUNTIME_URL = 'https://aka.ms/vs/17/release/vc_redist.x64.exe'

const packageFolder = (folder: string) => join(folder, 'node_modules', 'transcribe-cpp')

const hasVcRuntime = async () => {
  const system = join(process.env.SystemRoot ?? 'C:\\Windows', 'System32')
  const found = await Promise.all(VC_RUNTIME.map(file => exists(join(system, file))))
  return found.every(Boolean)
}

const platformProblem = async () => {
  if (!BUILDS[`${process.platform}-${process.arch}`]) return "The speech engine doesn't run on this kind of PC yet. Choose a cloud service instead."
  if (process.platform === 'win32' && !(await hasVcRuntime()))
    return `The speech engine needs the Microsoft Visual C++ Redistributable. Install it from ${VC_RUNTIME_URL}, then choose This PC again.`
  return undefined
}

const installed = async (folder: string) => {
  const manifest: unknown = await Bun.file(join(packageFolder(folder), 'package.json'))
    .json()
    .catch(() => undefined)
  return isRecord(manifest) && manifest.version === ENGINE_VERSION
}

const lastLine = (text: string) => text.trim().split('\n').at(-1)?.trim() || 'bun add failed'

const installEngine = async (folder: string) => {
  if (await installed(folder)) return
  await Bun.write(join(folder, 'package.json'), '{ "private": true }\n')
  const proc = Bun.spawn([process.execPath, 'add', '--exact', '--ignore-scripts', ...ENGINE], { cwd: folder, stdin: 'ignore', stdout: 'ignore', stderr: 'pipe', windowsHide: true })
  const [code, errors] = await Promise.all([proc.exited, new Response(proc.stderr).text()])
  if (code !== 0) throw new Error(`Couldn't install the speech engine: ${lastLine(errors)}`)
}

const engineEntry = (folder: string) => join(packageFolder(folder), 'dist', 'index.js')

export { engineEntry, installed, installEngine, platformProblem }
