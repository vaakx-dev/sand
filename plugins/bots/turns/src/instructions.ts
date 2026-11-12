import type { BotSummary } from '@sand/bots/contract'
import type { ProjectFiles } from '@sand/project/contract'
import type { Own } from '@sand/prompt/contract'

const NO_JOB = `## Your job

You have no job yet.
- If the user hasn't said what they want you for, ask, in one or two short questions at most.
- If their message is a task, do it first, then offer to take on that kind of work as your job.
- Once you know what you're for, write your job with bot_update, and a name if you have none. After that, change your job only when the user asks.`

const jobOf = (bot: BotSummary) => (bot.job.trim() ? `## Your job\n\n${bot.job.trim()}` : NO_JOB)

const projectsOf = ({ projects }: BotSummary, files: ProjectFiles | undefined) => {
  if (!projects.length) return []
  const placeOf = (project: string) => files?.copies().find(copy => copy.project === project)?.path ?? 'no folder on this PC'
  const labelOf = (project: string) => {
    const name = files?.name(project)
    return name ? `${name} (id ${project})` : project
  }
  const list = projects.map(project => `- ${labelOf(project)}: ${placeOf(project)}`).join('\n')
  return [`## Your projects\n\nYou manage these projects. Plan the work in them and start threads to do it, passing the project id to thread_start:\n\n${list}`]
}

const whoOf = (name: string) => (name ? `You are ${name}, one of the user's bots in sand.` : "You are one of the user's bots in sand, with no name yet.")

export const instructions = (bot: BotSummary, files: ProjectFiles | undefined): Own => ({
  intro: whoOf(bot.name),
  parts: [jobOf(bot), ...projectsOf(bot, files)],
})
