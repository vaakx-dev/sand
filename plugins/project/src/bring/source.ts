import { gitRunner } from '@sand/git-runner/contract'
import type { ContextCore } from 'drydock'
import type { CopySource, SourceInput } from '../contract'
import type { LocalCopies } from '../local/copies'
import { existingFolder } from '../registry/paths'
import { keptPaths } from './files'

export const copySource =
  (services: Pick<ContextCore, 'get'>, local: LocalCopies) =>
  async ({ project, how, files }: SourceInput): Promise<CopySource> => {
    const copy = local.copies().find(found => found.project === project)
    if (!copy) throw new Error('The PC with the files has no copy of this project.')
    const path = await existingFolder(copy.path)
    const kept = how === 'copy' ? await keptPaths(services.get(gitRunner), path) : []
    return { path, ...(kept && { files: [...kept, ...files] }) }
  }
