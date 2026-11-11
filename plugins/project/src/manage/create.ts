import type { GitRunner } from '@sand/git-runner/contract'
import { mkdir } from 'node:fs/promises'
import type { z } from 'zod'
import type { createInput, Project } from '../contract'
import { createFolder } from '../registry/folder/create'
import { fullPath } from '../registry/paths'
import type { Registry } from '../registry/registry'

type CreateInput = z.output<ReturnType<typeof createInput>>

interface CreateDeps {
  registry: Registry
  root: string
  git: GitRunner | undefined
}

const folderOf = async ({ folder, name }: CreateInput, root: string) => {
  if (!folder) {
    if (!name) throw new Error('Give a folder or a name')
    return createFolder(root, name)
  }
  const full = fullPath(folder)
  await mkdir(full, { recursive: true })
  return full
}

const startRepo = async (git: GitRunner | undefined, folder: string) => {
  if (!git) throw new Error("Git isn't available on this PC")
  if ((await git.maybe(folder, ['rev-parse', '--is-inside-work-tree'], { read: true })) === 'true') return
  await git.ok(folder, ['init'])
}

export const createProject = async (input: CreateInput, { registry, root, git }: CreateDeps): Promise<{ project: Project; sameRemote: string[] }> => {
  const folder = await folderOf(input, root)
  if (input.git) await startRepo(git, folder)
  const found = await registry.inspect(folder)
  const added = await registry.add(folder, input.copyOf)
  const renamed = input.folder && input.name && input.name !== added.name
  const project = renamed ? await registry.update(added.id, { name: input.name }) : added
  const fresh = !found.project && !found.restores && !input.copyOf
  return { project, sameRemote: fresh ? found.matches : [] }
}
