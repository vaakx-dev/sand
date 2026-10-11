import { samePath } from '@sand/kit/fs'

export interface ModeSetup {
  plugins: string[]
  user?: boolean
}

export const loadModes = async (file: string) => {
  for (const key of Object.keys(require.cache)) if (samePath(key, file)) delete require.cache[key]
  const module = await import(file)
  return module.modes as Record<string, ModeSetup>
}
