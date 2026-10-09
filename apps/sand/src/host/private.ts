import { replaceFile } from '@sand/host'
import { chmod, writeFile } from 'node:fs/promises'

export const writePrivateJson = async (path: string, value: unknown) => {
  const temporary = `${path}.tmp`
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 })
  if (process.platform !== 'win32') await chmod(temporary, 0o600)
  await replaceFile(temporary, path)
}
