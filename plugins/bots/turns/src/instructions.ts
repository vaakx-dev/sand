import type { BotSummary, Job } from '@sand/bots/contract'
import type { ProjectFiles } from '@sand/project/contract'
import type { Own } from '@sand/prompt/contract'

const NO_JOBS = `## Your jobs

You have no jobs yet.
- If the user hasn't said what they want you for, ask, in one or two short questions at most.
- If their message is a task, do it first, then offer to take it on as a job.
- Once you know what you're for, set the job up with job_create, and pick a name with bot_update if you have none.`

const JOB_RULES = `Each job is standing work you do for the user: its goal, and what done right means.
- Run a job on a schedule with routine_create, or when something changes with watch_create, passing its job id. With neither, it runs only when the user asks; offer to set one up.
- After each run of a job, call job_report once: done with a one-line summary, nothing when there was nothing to do, or needs with your question when the user has to decide. When they answer, finish the work and report again.
- A paused job doesn't run. Change, pause or remove a job with job_update and job_delete only when the user asks.`

export const jobBlock = ({ id, title, goal, done, paused }: Job) => [`### ${title} (job ${id})${paused ? ' · paused' : ''}`, `Goal: ${goal}`, `Done right: ${done}`].join('\n')

const jobsOf = ({ jobs }: BotSummary) => (jobs.length ? ['## Your jobs', JOB_RULES, ...jobs.map(jobBlock)].join('\n\n') : NO_JOBS)

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
  parts: [jobsOf(bot), ...projectsOf(bot, files)],
})
