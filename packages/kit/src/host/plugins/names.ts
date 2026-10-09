const lockfiles = new Set(['bun.lock', 'bun.lockb'])

export const executableList = '.executable'

export const unsharedName = (name: string): boolean =>
  name === 'node_modules' || name.startsWith('.') || lockfiles.has(name)

export const validPluginName = (name: string): boolean =>
  name.length > 0 &&
  !/[/\\:]/.test(name) &&
  !name.startsWith('.') &&
  name !== 'node_modules'

export const safeRelative = (path: string): boolean =>
  path.length > 0 &&
  !path.includes('\\') &&
  !path.startsWith('/') &&
  !/^[a-zA-Z]:/.test(path) &&
  path.split('/').every(segment => segment.length > 0 && !unsharedName(segment))
