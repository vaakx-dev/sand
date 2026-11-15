import { bundle, type Bundle, extensionProblem, type Modules } from '../bundle/build'
import type { Extension } from './discover'

export interface SiteOptions {
  find(): Promise<Extension[]>
  modules: Modules
  report(problem: string): void
  fault(addon: string, error: string): void
}

const reportProblems = (extensions: Extension[], built: Bundle, { report, fault }: SiteOptions) => {
  const failures = Object.entries(built.failed)
  if (!failures.length) return built.problems.forEach(report)
  const addons = new Map(extensions.map(extension => [extension.id, extension.addon]))
  for (const [id, error] of failures) {
    const addon = addons.get(id)
    if (addon) fault(addon, extensionProblem(id, error))
    else report(extensionProblem(id, error))
  }
}

export const createSite = async (options: SiteOptions) => {
  const extensions = await options.find()
  const built = await bundle(extensions, options.modules)
  reportProblems(extensions, built, options)

  return {
    current: () => built,
    list: () => extensions,
  }
}
