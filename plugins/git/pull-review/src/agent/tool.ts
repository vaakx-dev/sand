import { type PullRef, pullLabel } from '@sand/github/contract'
import type { PullLinks } from '@sand/pull-links/contract'
import type { Tool, Tools } from '@sand/tools/contract'
import { joinDisposers, plural } from '@sand/util'
import { z } from 'zod'
import type { Reviews } from '../pending/reviews'

export const commentTool = 'add_review_comment'

const group = 'pull-review'

const commentInput = z.object({
  path: z.string().min(1).describe("The changed file's path from the repository root"),
  line: z.number().int().positive().describe('The line the comment is about, numbered as in the changed file (or the old file for side LEFT)'),
  startLine: z.number().int().positive().optional().describe('The first line when the comment covers several lines; line is then the last one'),
  side: z.enum(['LEFT', 'RIGHT']).default('RIGHT').describe('RIGHT for added or unchanged lines, LEFT for removed lines'),
  body: z.string().min(1).describe('The comment, in Markdown: what is wrong, why it matters and what to change'),
  number: z.number().int().positive().optional().describe("The pull request's number. Leave it out when the thread has one linked pull request."),
})

export interface CommentToolDeps {
  reviews: Reviews
  pullLinks(): PullLinks | undefined
}

const linkedPull = async (deps: CommentToolDeps, session: string, number?: number): Promise<PullRef> => {
  const links = deps.pullLinks()
  if (!links) throw new Error('Review comments need the Thread pull requests plugin, which is turned off.')
  const linked = (await links.links(session)).links
  const chosen = number === undefined ? linked : linked.filter(link => link.number === number)
  const [only, ...rest] = chosen
  if (only && !rest.length) return { repo: only.repo, number: only.number }
  if (number !== undefined) throw new Error(`#${number} isn't linked to this thread.`)
  if (!only) throw new Error("This thread has no linked pull request, so there's no review to add to.")
  throw new Error(`This thread has ${linked.length} linked pull requests (${linked.map(link => `#${link.number}`).join(', ')}). Say which number.`)
}

const commentToolFor = (deps: CommentToolDeps): Tool<typeof commentInput> => ({
  name: commentTool,
  group,
  description:
    "Add a line comment to the user's pending review of the thread's linked pull request. It waits there for the user to edit and submit; nothing is posted to GitHub yet. Use it for specific, actionable findings on lines that are part of the change.",
  input: commentInput,
  async run({ number, ...comment }, { session }) {
    const ref = await linkedPull(deps, session.id, number)
    const pending = await deps.reviews.comment(ref, comment, true)
    return `Added to the pending review on ${pullLabel(ref)} at ${comment.path}:${comment.line}. ${plural(pending.comments.length, 'comment')} waiting.`
  },
})

export const reviewTools = (tools: Tools, deps: CommentToolDeps) =>
  joinDisposers(
    tools.group({ name: group, label: 'Pull request review', summary: "draft comments in the user's pending review of a pull request", load: 'on-demand' }),
    tools.register(commentToolFor(deps)),
  )
