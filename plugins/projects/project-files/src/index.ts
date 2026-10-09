import { readProjectsFile, writeProjectsFile } from '@sand/kit/fs'
import { definePlugin } from 'drydock'
import type { ProjectFiles } from './contract'
import { localFiles } from './local'
import { watchProjects } from './watch'

export default definePlugin({
  name: 'project-files',
  description: 'Reads projects.json and finds which project a folder on this PC belongs to',
  inject: ['cli'],
  apply(ctx) {
    const { home } = ctx.cli
    const local = localFiles(home)
    const listeners = new Set<() => void>()
    ctx.effect(() => watchProjects(home, () => listeners.forEach(listener => listener())))

    const projectFiles: ProjectFiles = {
      read: () => readProjectsFile(home),
      write: projects => writeProjectsFile(home, projects),
      local: local.local,
      copies: local.copies,
      ofFolder: local.ofFolder,
      onChange(onChange) {
        listeners.add(onChange)
        return () => void listeners.delete(onChange)
      },
    }
    ctx.provide('projectFiles', projectFiles)
  },
})
