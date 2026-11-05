import { chmod, mkdir, rm, stat } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { pluginFiles } from './walk'

export const copyPlugin = async (from: string, to: string) => {
  await rm(to, { recursive: true, force: true })
  await mkdir(to, { recursive: true })
  for (const path of await pluginFiles(from)) {
    const source = join(from, ...path.split('/'))
    const target = join(to, ...path.split('/'))
    await mkdir(dirname(target), { recursive: true })
    await Bun.write(target, Bun.file(source))
    if (process.platform !== 'win32') await chmod(target, (await stat(source)).mode & 0o777)
  }
}
