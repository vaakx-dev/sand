import { dirname, join } from 'node:path'

export const hostVersion = async (main: string) => {
  try {
    const { version } = (await Bun.file(join(dirname(main), '..', 'package.json')).json()) as { version?: unknown }
    return typeof version === 'string' ? version : ''
  } catch {
    return ''
  }
}
