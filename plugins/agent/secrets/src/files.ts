import { mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const lifetime = 24 * 60 * 60_000

export const secretFiles = (folder: string) => ({
  async write(value: string) {
    await mkdir(folder, { recursive: true, mode: 0o700 })
    const file = join(folder, Bun.randomUUIDv7())
    await writeFile(file, value, { mode: 0o600, flag: 'wx' })
    return file
  },
  async sweep() {
    const cutoff = Date.now() - lifetime
    for (const name of await readdir(folder).catch((): string[] => [])) {
      const file = join(folder, name)
      const info = await stat(file).catch(() => undefined)
      if (info && info.mtimeMs < cutoff) await rm(file, { force: true })
    }
  },
})
