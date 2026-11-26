import { automationsOf, type BotView, type Parts } from './parts'

const VIEWS: BotView[] = ['jobs', 'chat']

const viewOf = (tab: string | undefined) => VIEWS.find(view => view === tab)

const hasJobs = (parts: Parts, bot: string) => Boolean(parts.store.find(bot)?.jobs.length)

const automated = (parts: Parts, bot: string) => hasJobs(parts, bot) || automationsOf(parts, bot).length > 0

const shownView = (parts: Parts, bot: string, tab: string | undefined): BotView => {
  if (!automated(parts, bot)) return 'chat'
  return viewOf(tab) ?? (hasJobs(parts, bot) ? 'jobs' : 'chat')
}

export { automated, shownView, viewOf }
