import type { Command, Project, SessionSummary, UI } from '@sand/protocol'
import { localProjects } from '@sand/host'

const counts = (sessions: SessionSummary[]) => {
  const threads = new Map<string, number>()
  for (const session of sessions) {
    if (session.kind === 'agent' || !session.project) continue
    threads.set(session.project, (threads.get(session.project) ?? 0) + 1)
  }
  return threads
}

const plural = (count: number) => `${count} ${count === 1 ? 'thread' : 'threads'}`

const where = (project: Project, device?: string) => {
  const copy = device ? project.copies[device] : undefined
  return copy && !copy.removed ? copy.path : 'no copy here'
}

const listing = (home: string, sessions: SessionSummary[], all: boolean) => {
  const { device, projects } = localProjects(home)
  const shown = projects.filter(project => all || !project.hidden)
  if (!shown.length) return 'No projects yet.'
  const threads = counts(sessions)
  return shown
    .map(project =>
      [project.name, where(project, device), plural(threads.get(project.id) ?? 0), project.hidden && 'hidden']
        .filter(Boolean)
        .join(' · '),
    )
    .join('\n')
}

export const projectCommand = (ui: UI, home: string, sessions: () => SessionSummary[]): Command => ({
  name: 'project',
  title: 'Projects',
  description: 'List projects on this PC; change them in the web UI or with `sand project`',
  args: '[all]',
  run(args) {
    const word = args.trim()
    if (word && word !== 'all') return ui.notify('Usage: /project [all]', 'error')
    ui.notify(listing(home, sessions(), word === 'all'))
  },
})
