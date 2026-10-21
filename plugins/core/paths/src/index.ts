import { cli } from '@sand/config/contract'
import { type ProjectFiles, projectFiles } from '@sand/project/contract'
import { nearestRoot } from '@sand/util/fs'
import { definePlugin } from 'drydock'
import { type Paths, paths } from './contract'

const copyOf = (files: ProjectFiles, cwd: string, project?: string | null) => {
  const pathOf = (id: string | null | undefined) => (id ? files.copies().find(copy => copy.project === id)?.path : undefined)
  return pathOf(project) ?? pathOf(files.ofFolder(cwd))
}

export default definePlugin({
  name: 'paths',
  description: 'Where sand keeps its files: the home folder and project folders',
  inject: { cli, projectFiles },
  apply(ctx) {
    const service: Paths = {
      home: ctx.cli.home,
      projectFolder: (cwd, project) => copyOf(ctx.projectFiles, cwd, project) ?? nearestRoot(cwd) ?? cwd,
    }
    ctx.provide(paths, service)
  },
})
