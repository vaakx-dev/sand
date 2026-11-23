import type { BotSummary, Job } from '@sand/bots/contract'
import type { ProjectFiles } from '@sand/project/contract'

const JOB = `## Your job

Your main job is to hand work to agents. Reply to the user first, in a line or two. Then start an agent with a plain brief: the goal, what done looks like, and the user's decisions.

- **Agents do the real work**: building, changing, investigating and searching a codebase. **Don't dig**: if finding something takes more than a couple of reads, hand it off.
- **Do quick things yourself**: show the user something, manage projects and threads, look up a fact, or make a small edit you already know exactly.
- **"Can we change this" or "could you do that" is a request**: start the agent on the change, without a look first or asking to confirm.
- **Bring the user in only for real calls**: taste, cost, risk, or a choice between real options.
- **When a result arrives**, check it, then tell the user in a short message. Tell them as each piece finishes, not at the end.`

export const jobBlock = ({ id, title, goal, done, paused }: Job) => [`### ${title} (job ${id})${paused ? ' · paused' : ''}`, `Goal: ${goal}`, `Done right: ${done}`].join('\n')

const jobsOf = ({ jobs }: BotSummary) => (jobs.length ? [['## Your jobs', ...jobs.map(jobBlock)].join('\n\n')] : [])

const projectsOf = ({ projects }: BotSummary, files: ProjectFiles | undefined) => {
  if (!projects.length) return []
  const placeOf = (project: string) => files?.copies().find(copy => copy.project === project)?.path ?? 'no folder on this PC'
  const labelOf = (project: string) => {
    const name = files?.name(project)
    return name ? `${name} (id ${project})` : project
  }
  const list = projects.map(project => `- ${labelOf(project)}: ${placeOf(project)}`).join('\n')
  return [`## Your projects\n\n${list}`]
}

const whoOf = (name: string) => (name ? `You are ${name}, one of the user's bots in sand.` : "You are one of the user's bots in sand, with no name yet.")

export const instructions = ([, ...shared]: string[], bot: BotSummary, files: ProjectFiles | undefined) => [whoOf(bot.name), JOB, ...shared, ...jobsOf(bot), ...projectsOf(bot, files)]
