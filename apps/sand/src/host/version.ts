import { join } from 'node:path'

export const hostVersion = async () => {
  try {
    const { version } = (await Bun.file(join(import.meta.dir, '..', '..', 'package.json')).json()) as { version?: unknown }
    return typeof version === 'string' ? version : ''
  } catch {
    return ''
  }
}
