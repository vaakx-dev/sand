import { gitRunner } from '@sand/git-runner/contract'
import { transfers } from '@sand/transfers/contract'
import type { ContextCore } from 'drydock'
import type { ProjectOffer } from '../contract'
import type { LocalCopies } from '../local/copies'
import { existingFolder } from '../registry/paths'
import { keptPaths } from './files'

export const offerCopy =
  (services: Pick<ContextCore, 'get'>, local: LocalCopies) =>
  async ({ project, how, files }: ProjectOffer) => {
    const copy = local.copies().find(found => found.project === project)
    if (!copy) throw new Error('The PC with the files has no copy of this project.')
    const sender = services.get(transfers)
    if (!sender) throw new Error('Copying files needs the File transfers plugin, which is off on the PC with the files.')
    const path = await existingFolder(copy.path)
    const kept = how === 'copy' ? await keptPaths(services.get(gitRunner), path) : []
    return sender.offerPath({ path, ...(kept && { files: [...kept, ...files] }) })
  }
