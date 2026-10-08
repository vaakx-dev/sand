import { isPlugin } from '../plugin/define'

export const loadPlugin = async (entry: string) => {
  const module = await import(entry)
  if (!isPlugin(module.default)) throw new Error(`${entry} has no default plugin export`)
  return module.default
}
