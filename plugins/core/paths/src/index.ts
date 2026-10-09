import { nearestRoot } from '@sand/kit/fs'
import type { ProjectFiles } from '@sand/project-files/contract'
import { definePlugin } from 'drydock'
import { mkdirSync } from 'node:fs'
import { basename, join } from 'node:path'
import type { Paths } from './contract'

const copyOf = (files: ProjectFiles, cwd: string, project?: string | null) => {
  const pathOf = (id: string | null | undefined) => (id ? files.copies().find(copy => copy.project === id)?.path : undefined)
  return pathOf(project) ?? pathOf(files.ofFolder(cwd))
}

export default definePlugin({
  name: 'paths',
  description: 'Where sand keeps its files: the home folder, thread scratch folders and project folders',
  inject: ['cli', 'projectFiles'],
  apply(ctx) {
    const { home } = ctx.cli
    const scratchRoot = () => join(home, 'scratch')
    const paths: Paths = {
      home,
      scratchRoot,
      scratchFolder(id) {
        if (!id || id === '.' || id === '..' || basename(id) !== id) throw new Error('Invalid thread id')
        const folder = join(scratchRoot(), id)
        mkdirSync(folder, { recursive: true })
        return folder
      },
      projectFolder: (cwd, project) => copyOf(ctx.projectFiles, cwd, project) ?? nearestRoot(cwd) ?? cwd,
    }
    ctx.provide('paths', paths)
  },
})
