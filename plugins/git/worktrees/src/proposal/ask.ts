import type { JobRequest, SubModel } from '@sand/sub-model/contract'
import { z } from 'zod'
import type { SetupLines } from '../contract'
import type { Facts } from './facts'

const system = `You set up fresh git worktrees so a coding agent's first command works. A new worktree holds only the files git tracks: no installed dependencies and none of the local files git ignores. You get facts about the main checkout. Pick the local files to copy into each new worktree and the commands to run there. Copy files the project needs to run, such as .env files and local settings; leave out caches, logs, build output and personal editor files. Run every listed install command, except when two install the same folder; then keep the one a tracked lockfile names. Choose only from the lists, written exactly as given. Reply as JSON: {"copy": [...], "run": [...]}.`

const chosen = z.object({ copy: z.array(z.string()), run: z.array(z.string()) })

const describe = ({ files, commands }: Facts) =>
  [
    'Local files in the main checkout:',
    ...(files.length ? files.map(file => `- ${file}`) : ['(none)']),
    '',
    'Install commands:',
    ...(commands.length ? commands.map(({ command, why }) => `- ${command} (${why})`) : ['(none)']),
  ].join('\n')

export const askSetup = async (sub: SubModel, facts: Facts, session: string | undefined): Promise<SetupLines> => {
  const request: JobRequest = { tier: 'fast', system, prompt: describe(facts), ...(session ? { session } : {}) }
  const answer = await sub.json(request, chosen)
  return {
    copy: facts.files.filter(file => answer.copy.includes(file)),
    run: facts.commands.map(({ command }) => command).filter(command => answer.run.includes(command)),
  }
}
