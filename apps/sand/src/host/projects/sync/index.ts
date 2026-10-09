import { definePlugin } from 'drydock'
import { cleanProjects } from './clean'
import { createRounds } from './rounds'
import { watchRemotes } from './watch'

const settle = 1000
const every = 120_000

export const projectSyncPlugin = definePlugin({
  name: 'project-sync',
  description: 'Keeps the project registry in step with paired PCs',
  inject: ['hostOptions', 'hub', 'hostProjects'],
  apply(ctx) {
    const { home } = ctx.hostOptions
    const projects = ctx.hostProjects
    ctx.effect(() =>
      ctx.hub.handle('projects.sync', async request => {
        await projects.merge(cleanProjects(request.projects))
        return projects.all()
      }),
    )
    const rounds = createRounds(home, projects)
    let timer: Timer | undefined
    ctx.on('host.projects', () => {
      clearTimeout(timer)
      timer = setTimeout(() => rounds.round(false), settle)
    })
    ctx.effect(() => watchRemotes(home, () => rounds.round(true)))
    ctx.effect(() => {
      const interval = setInterval(() => rounds.round(true), every)
      return () => {
        clearInterval(interval)
        clearTimeout(timer)
        rounds.stop()
      }
    })
    rounds.round(true)
  },
})
