import type { Ask } from '@sand/ask/contract'
import type { GitRepo, GitRunner } from '@sand/git/contract'
import { errorMessage, oneLine } from '@sand/util'
import { z } from 'zod'
import { GitHubError, sentence } from '../api/errors'
import type { PullText } from '../contract'
import { baseRef } from './base'
import { readChanges } from './changes'
import { textPrompt, textSystem } from './prompt'
import { readTemplate } from './template'

export interface TextRequest {
  cwd: string
  base?: string
  session?: string
}

export interface TextDeps {
  git: GitRunner
  repos: GitRepo
  ask(): Ask | undefined
}

const written = z.object({ title: z.string().min(1), body: z.string() })

const cannotWrite = (why: string) => new GitHubError(sentence(`Couldn't write the pull request text: ${why.replace(/\.$/, '')}; write it yourself`))

export const writePullText = async ({ git, repos, ask }: TextDeps, request: TextRequest): Promise<PullText> => {
  const model = ask()
  if (!model) throw cannotWrite('no model is available')
  const local = await repos.local(request.cwd)
  if (!local.repo) throw cannotWrite("this folder isn't a git repository")
  if (local.detached || !local.branch) throw cannotWrite('no branch is checked out')
  const base = request.base ?? (await repos.defaultBranch(local.root))
  if (!base) throw cannotWrite("the repository's default branch is unknown")
  const ref = await baseRef(git, local.root, base)
  if (!ref) throw cannotWrite(`there is no branch ${base} to compare with`)
  const [changes, template] = await Promise.all([readChanges(git, local.root, ref), readTemplate(local.root)])
  if (!changes.commits.trim()) throw cannotWrite(`${local.branch} has no commits that aren't on ${base}`)
  try {
    const reply = await model.json({ system: textSystem, prompt: textPrompt(local.branch, base, changes, template), ...(request.session ? { session: request.session } : {}) }, written)
    return { title: oneLine(reply.title), body: reply.body.trim() }
  } catch (error) {
    throw cannotWrite(errorMessage(error))
  }
}
