import type { BotSummary } from '@sand/bots/contract'
import type { Subject, SubjectProject } from '@sand/ui-shell/contract'
import type { ProjectEntry } from '@sand/web-client/contract'
import { stored } from '@vaakx-dev/vrui'
import type { Parts } from './parts'

interface Place {
  project: string
  location: ProjectEntry
}

const MIN_SWITCHABLE = 2

const locationOf = (parts: Parts, project: string, device: string) => {
  const usable = parts.projects.get().find(group => group.id === project)?.locations.filter(location => !location.missing) ?? []
  return usable.find(location => location.device === device) ?? usable[0]
}

const subjectProject = (parts: Parts, project: string): SubjectProject => {
  const { name, icon } = parts.shown(project)
  return { id: project, name, icon }
}

const placesOf = (parts: Parts, bot: BotSummary, device: string) =>
  bot.projects.flatMap<Place>(project => {
    const location = locationOf(parts, project, device)
    return location ? [{ project, location }] : []
  })

const botSubject = (parts: Parts) => {
  const picked = stored<Record<string, string>>('sand.bots.project', {})

  const pick = (bot: string, project: string) => picked.update(all => ({ ...all, [bot]: project }))

  return (bot: BotSummary): Subject => {
    const chat = parts.chat(bot.id)
    const home: Subject = { session: bot.id, owner: 'bot', device: chat?.device ?? parts.ctx.threads.device(), cwd: chat?.info.cwd ?? bot.folder }
    const places = placesOf(parts, bot, home.device)
    const chosen = places.find(place => place.project === picked.get()[bot.id]) ?? places[0]
    if (!chosen || places.length < MIN_SWITCHABLE) return home
    return {
      ...home,
      device: chosen.location.device,
      cwd: chosen.location.path,
      projects: {
        list: places.map(place => subjectProject(parts, place.project)),
        picked: subjectProject(parts, chosen.project),
        pick: project => pick(bot.id, project),
      },
    }
  }
}

export { botSubject }
