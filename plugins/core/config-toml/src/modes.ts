export interface ModeSetup {
  plugins: string[]
  user?: boolean
}

const same = (a: string, b: string) => (process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b)

export const loadModes = async (file: string) => {
  for (const key of Object.keys(require.cache)) if (same(key, file)) delete require.cache[key]
  const module = await import(file)
  return module.modes as Record<string, ModeSetup>
}
