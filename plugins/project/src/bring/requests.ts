import { gitRunner } from '@sand/git-runner/contract'
import type { Server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import type { ContextCore } from 'drydock'
import { projectsBring, projectsBringing, projectsIgnored, projectsSource } from '../contract'
import type { LocalCopies } from '../local/copies'
import { existingFolder } from '../registry/paths'
import { bringProject } from './bring'
import { ignoredFiles } from './files'
import { copySource } from './source'

interface BringServices {
  here: string
  local: LocalCopies
  services: Pick<ContextCore, 'get'>
}

export const serveBring = (server: Server, { here, local, services }: BringServices) => {
  const source = copySource(services, local)
  const bring = bringProject({ here, local, services, source, step: step => server.broadcast(projectsBringing, step) })
  return joinDisposers(
    server.handle(projectsIgnored, async ({ path }) => ignoredFiles(services.get(gitRunner), await existingFolder(path))),
    server.handle(projectsSource, source),
    server.handle(projectsBring, bring),
  )
}
