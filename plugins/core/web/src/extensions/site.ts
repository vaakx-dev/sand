import { bundle, type Contracts } from '../bundle/build'
import type { Extension } from './discover'

export interface SiteOptions {
  find(): Promise<Extension[]>
  contracts: Contracts
  report(problem: string): void
}

export const createSite = async ({ find, contracts, report }: SiteOptions) => {
  const extensions = await find()
  const built = await bundle(extensions, contracts)
  for (const problem of built.problems) report(problem)

  return {
    current: () => built,
    list: () => extensions,
  }
}
