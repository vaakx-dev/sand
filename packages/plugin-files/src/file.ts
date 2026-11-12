import { chmod, mkdir, stat } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { pluginFiles } from './walk'

export interface PluginFile {
  path: string
  bytes: Uint8Array
  executable: boolean
}

const windows = process.platform === 'win32'

const EXECUTABLE_MODE = 0o755
const PLAIN_MODE = 0o644
const EXECUTE_BITS = 0o111

const at = (folder: string, path: string) => join(folder, ...path.split('/'))

const readFile = async (folder: string, path: string): Promise<PluginFile> => {
  const full = at(folder, path)
  const [bytes, info] = await Promise.all([Bun.file(full).bytes(), stat(full)])
  return { path, bytes, executable: !windows && (info.mode & EXECUTE_BITS) !== 0 }
}

export const readPluginFiles = async (folder: string): Promise<PluginFile[]> =>
  Promise.all((await pluginFiles(folder)).map(path => readFile(folder, path)))

export const writeFiles = async (folder: string, files: PluginFile[]) => {
  for (const file of files) {
    const full = at(folder, file.path)
    await mkdir(dirname(full), { recursive: true })
    await Bun.write(full, file.bytes)
    if (!windows) await chmod(full, file.executable ? EXECUTABLE_MODE : PLAIN_MODE)
  }
}
