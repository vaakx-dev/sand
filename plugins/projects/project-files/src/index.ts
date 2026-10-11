import { debouncedWatch, projectsPath, samePath } from '@sand/kit/fs'
import { definePlugin } from 'drydock'
import { join } from 'node:path'
import { localFiles } from './local'

export default definePlugin({
  name: 'project-files',
  description: 'Reads projects.json and finds which project a folder on this PC belongs to',
  inject: ['cli'],
  apply(ctx) {
    const { home } = ctx.cli
    const listeners = new Set<() => void>()
    const isProjectsFile = (filename: string | null) => filename !== null && samePath(join(home, filename), projectsPath(home))
    ctx.effect(() => debouncedWatch(home, { only: isProjectsFile }, () => listeners.forEach(listener => listener())))
    ctx.provide('projectFiles', {
      ...localFiles(home),
      onChange(onChange) {
        listeners.add(onChange)
        return () => void listeners.delete(onChange)
      },
    })
  },
})
