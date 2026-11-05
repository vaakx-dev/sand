import { bundle, type Modules } from '../bundle/build'
import type { Extension } from './discover'

export interface SiteOptions {
  find(): Promise<Extension[]>
  modules: Modules
  report(problem: string): void
}

export const createSite = async ({ find, modules, report }: SiteOptions) => {
  const extensions = await find()
  const built = await bundle(extensions, modules)
  for (const problem of built.problems) report(problem)

  return {
    current: () => built,
    list: () => extensions,
  }
}
